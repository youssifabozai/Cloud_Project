const fs = require('fs');
const path = require('path');

const folders = ['AWS', 'auth', 'comments', 'projects', 'tasks', 'teams', 'users'];
const srcDir = path.join(__dirname, 'src');

folders.forEach(folder => {
  const isLower = folder === folder.toLowerCase();
  const folderName = folder.toLowerCase(); // aws, auth, etc.
  const ClassPrefix = folder === 'AWS' ? 'Aws' : folder.charAt(0).toUpperCase() + folder.slice(1);

  const moduleContent = `import { Module } from '@nestjs/common';
import { ${ClassPrefix}Controller } from './${folderName}.controller';
import { ${ClassPrefix}Service } from './${folderName}.service';

@Module({
  controllers: [${ClassPrefix}Controller],
  providers: [${ClassPrefix}Service],
})
export class ${ClassPrefix}Module {}
`;

  const controllerContent = `import { Controller } from '@nestjs/common';
import { ${ClassPrefix}Service } from './${folderName}.service';

@Controller('${folderName}')
export class ${ClassPrefix}Controller {
  constructor(private readonly ${folderName}Service: ${ClassPrefix}Service) {}
}
`;

  const serviceContent = `import { Injectable } from '@nestjs/common';

@Injectable()
export class ${ClassPrefix}Service {}
`;

  const modulePath = path.join(srcDir, folder, `${folderName}.module.ts`);
  const controllerPath = path.join(srcDir, folder, `${folderName}.controller.ts`);
  const servicePath = path.join(srcDir, folder, `${folderName}.service.ts`);

  fs.writeFileSync(modulePath, moduleContent);
  fs.writeFileSync(controllerPath, controllerContent);
  fs.writeFileSync(servicePath, serviceContent);
});

console.log('Files created successfully!');
