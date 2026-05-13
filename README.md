# Cloud_Project: Mini-Jira AWS Backend

This repository contains the backend code for the Mini-Jira application, built with NestJS and fully integrated with AWS (DynamoDB, S3, SNS, SQS, EventBridge, Cognito).

## API Endpoints Mapping & Business Rules

This document maps out all the endpoints that will be built for the Mini-Jira AWS application.
All endpoints (except those marked as **Public**) require a valid Cognito JWT Bearer token.

**Core Rule:** Security and Team Isolation are enforced strictly on the *server-side* using DynamoDB GSIs. 

### 1. Health & Debug
- **`GET /`** (Public)
  - **Purpose:** Health check for the AWS Application Load Balancer.
- **`GET /aws-test`** (Public)
  - **Purpose:** Verifies DynamoDB connection and lists tables.

### 2. Teams
*Employees belong to a specific team. Managers oversee teams.*
- **`POST /teams`**
  - **Purpose:** Create a new team.
  - **Roles:** `Admin`
- **`GET /teams`**
  - **Purpose:** List teams based on role.
    - *Filter:* Employees only fetch their *own* team. Managers and Admins fetch *all* teams.
  - **Roles:** Any authenticated user.
- **`GET /teams/:teamId`**
  - **Purpose:** Get a specific team. Employees can only fetch their own team's ID.
  - **Roles:** Any authenticated user.
- **`DELETE /teams/:teamId`**
  - **Purpose:** Delete a team.
  - **Roles:** `Admin`

### 3. Projects
*Projects are assigned to specific users or teams.*
- **`POST /projects`**
  - **Purpose:** Create a new project.
  - **Roles:** `Admin`
- **`GET /projects`**
  - **Purpose:** List projects based on role.
    - *Filter:* Employees and Managers only fetch projects assigned to them. Admins fetch *all* projects.
  - **Roles:** Any authenticated user.
- **`GET /projects/:projectId`**
  - **Purpose:** Get details of a project. Server checks if user is assigned or is Admin.
  - **Roles:** Any authenticated user.
- **`PUT /projects/:projectId`**
  - **Purpose:** Update a project.
  - **Roles:** `Manager`, `Admin`
- **`DELETE /projects/:projectId`**
  - **Purpose:** Delete a project.
  - **Roles:** `Admin`

### 4. Tasks (The Core Engine)
*Tasks are assigned to employees on specific teams. Contains S3 image integration and SNS triggers.*
- **`POST /tasks`**
  - **Purpose:** Create a task and upload an optional image attachment to S3. Emits `TaskAssigned` to SNS if assigned.
  - **Roles:** `Manager`
- **`GET /tasks`**
  - **Purpose:** List tasks based on role. 
    - *Filter (CRITICAL):* If `Employee`, it strictly returns tasks using the DynamoDB GSI where `teamId` equals their own team ID. `Manager` bypasses this filter and sees all tasks.
  - **Roles:** Any authenticated user.
- **`GET /tasks/:taskId`**
  - **Purpose:** Get a specific task. If Employee, backend strictly validates that the task's `teamId` matches the employee's `teamId`. An employee cannot fetch a task from another team even if they guess the ID.
  - **Roles:** Any authenticated user.
- **`PUT /tasks/:taskId`**
  - **Purpose:** Update a task (e.g., status: To Do -> In Progress). If the status changes, an entry is written to the **Audit Log**. If the assignee is changed, emits SNS. Also handles updating the S3 image attachment.
  - **Roles:** `Manager` (full access) or `Employee` (status updates only, restricted to own team).
- **`DELETE /tasks/:taskId`**
  - **Purpose:** Deletes the task from DynamoDB and deletes the corresponding image from S3.
  - **Roles:** `Manager`

### 5. Comments
*Comments on a specific task.*
- **`POST /comments`**
  - **Purpose:** Add a comment to a task. Enforces team isolation logic.
  - **Roles:** Any authenticated user.
- **`GET /comments/:taskId`**
  - **Purpose:** List all comments for a specific task. Enforces team isolation logic.
  - **Roles:** Any authenticated user.

### 6. Activity / Audit Logs
*Logs system actions for tracking.*
- **`GET /audit-logs`**
  - **Purpose:** Fetches the activity log of status changes (who moved a task, when it was moved). 
  - **Roles:** `Manager`, `Admin`