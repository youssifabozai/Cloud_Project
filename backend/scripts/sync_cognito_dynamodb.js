const fs = require('fs');
const path = require('path');
const {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminUpdateUserAttributesCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const {
    DynamoDBClient,
} = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    DeleteCommand,
    UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

function loadEnvFile(envFilePath) {
    if (!fs.existsSync(envFilePath)) {
        return;
    }

    const contents = fs.readFileSync(envFilePath, 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) {
            continue;
        }

        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function normalizeRole(role) {
    const value = String(role || 'EMPLOYEE').trim().toUpperCase();
    if (value === 'ADMIN' || value === 'MANAGER' || value === 'EMPLOYEE') {
        return value;
    }
    return 'EMPLOYEE';
}

function normalizeText(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

async function scanAll(docClient, tableName) {
    const items = [];
    let lastEvaluatedKey;

    do {
        const response = await docClient.send(
            new ScanCommand({
                TableName: tableName,
                ExclusiveStartKey: lastEvaluatedKey,
            }),
        );
        if (response.Items?.length) {
            items.push(...response.Items);
        }
        lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return items;
}

async function listAllCognitoUsers(cognitoClient, userPoolId) {
    const users = [];
    let paginationToken;

    do {
        const response = await cognitoClient.send(
            new ListUsersCommand({
                UserPoolId: userPoolId,
                Limit: 60,
                ...(paginationToken ? { PaginationToken: paginationToken } : {}),
            }),
        );

        if (response.Users?.length) {
            users.push(...response.Users);
        }

        paginationToken = response.PaginationToken;
    } while (paginationToken);

    return users;
}

function toAttributeMap(attributes) {
    return Object.fromEntries((attributes || []).map((attr) => [attr.Name, attr.Value]));
}

async function main() {
    const rootDir = path.resolve(__dirname, '..');
    loadEnvFile(path.join(rootDir, '.env'));

    const region = process.env.AWS_REGION || 'us-east-1';
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const usersTableName = process.env.TABLE_USERS;

    if (!userPoolId) {
        throw new Error('COGNITO_USER_POOL_ID is required');
    }
    if (!usersTableName) {
        throw new Error('TABLE_USERS is required');
    }

    const cognitoClient = new CognitoIdentityProviderClient({ region });
    const dynamoClient = new DynamoDBClient({ region });
    const docClient = DynamoDBDocumentClient.from(dynamoClient, {
        marshallOptions: { removeUndefinedValues: true },
    });

    console.log(`Scanning Cognito user pool ${userPoolId}...`);
    const cognitoUsers = await listAllCognitoUsers(cognitoClient, userPoolId);
    console.log(`Found ${cognitoUsers.length} Cognito users.`);

    console.log(`Scanning DynamoDB table ${usersTableName}...`);
    const dynamoUsers = await scanAll(docClient, usersTableName);
    console.log(`Found ${dynamoUsers.length} DynamoDB users.`);

    const dynamoById = new Map();
    const dynamoByEmail = new Map();
    for (const user of dynamoUsers) {
        if (user.userId) {
            dynamoById.set(String(user.userId), user);
        }
        if (user.email) {
            dynamoByEmail.set(normalizeText(user.email).toLowerCase(), user);
        }
    }

    let createdOrMigrated = 0;
    let updatedDynamo = 0;
    let updatedCognito = 0;
    let skippedNoEmail = 0;

    for (const cognitoUser of cognitoUsers) {
        const attributes = toAttributeMap(cognitoUser.Attributes);
        const cognitoSub = attributes.sub;
        const email = normalizeText(attributes.email).toLowerCase();
        const fullName = normalizeText(attributes.name);
        const role = normalizeRole(attributes['custom:role']);
        const teamId = normalizeText(attributes['custom:team']);
        const username = cognitoUser.Username;

        if (!cognitoSub) {
            continue;
        }

        let dynamoUser = dynamoById.get(cognitoSub) || null;
        const legacyUser = email ? dynamoByEmail.get(email) || null : null;

        if (!dynamoUser && legacyUser && legacyUser.userId !== cognitoSub) {
            const migratedUser = {
                ...legacyUser,
                userId: cognitoSub,
                email: legacyUser.email || email,
                fullName: legacyUser.fullName || fullName || null,
                role: normalizeRole(legacyUser.role || role),
                teamId: legacyUser.teamId ?? teamId ?? null,
                updatedAt: new Date().toISOString(),
                createdAt: legacyUser.createdAt || new Date().toISOString(),
            };

            await docClient.send(
                new PutCommand({
                    TableName: usersTableName,
                    Item: migratedUser,
                }),
            );
            await docClient.send(
                new DeleteCommand({
                    TableName: usersTableName,
                    Key: { userId: legacyUser.userId },
                }),
            );

            dynamoById.set(cognitoSub, migratedUser);
            dynamoByEmail.set(email, migratedUser);
            dynamoUser = migratedUser;
            createdOrMigrated += 1;
            console.log(`Migrated legacy DynamoDB user ${legacyUser.userId} -> ${cognitoSub}`);
        }

        if (!dynamoUser) {
            const now = new Date().toISOString();
            const newUser = {
                userId: cognitoSub,
                email: email || attributes.email || username,
                fullName: fullName || null,
                role,
                teamId: teamId || null,
                createdAt: now,
                updatedAt: now,
            };

            await docClient.send(
                new PutCommand({
                    TableName: usersTableName,
                    Item: newUser,
                }),
            );
            dynamoById.set(cognitoSub, newUser);
            if (email) {
                dynamoByEmail.set(email, newUser);
            }
            createdOrMigrated += 1;
            console.log(`Created DynamoDB user for Cognito sub ${cognitoSub}`);
            dynamoUser = newUser;
        }

        const desiredUpdates = {};
        if (email && normalizeText(dynamoUser.email).toLowerCase() !== email) {
            desiredUpdates.email = email;
        }
        if (fullName && normalizeText(dynamoUser.fullName) !== fullName) {
            desiredUpdates.fullName = fullName;
        }
        if (normalizeRole(dynamoUser.role) !== role) {
            desiredUpdates.role = role;
        }
        if (normalizeText(dynamoUser.teamId) !== teamId) {
            desiredUpdates.teamId = teamId || null;
        }

        if (Object.keys(desiredUpdates).length > 0) {
            await docClient.send(
                new UpdateCommand({
                    TableName: usersTableName,
                    Key: { userId: cognitoSub },
                    UpdateExpression: 'SET #email = :email, #fullName = :fullName, #role = :role, #teamId = :teamId, updatedAt = :updatedAt',
                    ExpressionAttributeNames: {
                        '#email': 'email',
                        '#fullName': 'fullName',
                        '#role': 'role',
                        '#teamId': 'teamId',
                    },
                    ExpressionAttributeValues: {
                        ':email': desiredUpdates.email ?? dynamoUser.email ?? email,
                        ':fullName': desiredUpdates.fullName ?? dynamoUser.fullName ?? fullName,
                        ':role': desiredUpdates.role ?? normalizeRole(dynamoUser.role),
                        ':teamId': desiredUpdates.teamId ?? dynamoUser.teamId ?? null,
                        ':updatedAt': new Date().toISOString(),
                    },
                }),
            );
            updatedDynamo += 1;
            console.log(`Updated DynamoDB user ${cognitoSub}`);
        }

        if (!email) {
            skippedNoEmail += 1;
            continue;
        }

        const cognitoDesiredAttributes = [];
        if (fullName) {
            cognitoDesiredAttributes.push({ Name: 'name', Value: fullName });
        }
        if (role) {
            cognitoDesiredAttributes.push({ Name: 'custom:role', Value: role });
        }
        if (teamId) {
            cognitoDesiredAttributes.push({ Name: 'custom:team', Value: teamId });
        }

        if (cognitoDesiredAttributes.length > 0) {
            await cognitoClient.send(
                new AdminUpdateUserAttributesCommand({
                    UserPoolId: userPoolId,
                    Username: username,
                    UserAttributes: cognitoDesiredAttributes,
                }),
            );
            updatedCognito += 1;
            console.log(`Updated Cognito user ${username}`);
        }
    }

    console.log('Sync complete.');
    console.log(`Created/migrated DynamoDB records: ${createdOrMigrated}`);
    console.log(`Updated DynamoDB records: ${updatedDynamo}`);
    console.log(`Updated Cognito records: ${updatedCognito}`);
    console.log(`Cognito users without email skipped: ${skippedNoEmail}`);
}

main().catch((error) => {
    console.error('Sync failed:', error.message);
    process.exit(1);
});