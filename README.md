# Cloud_Project: Mini-Jira AWS Backend

This repository contains the backend code for the Mini-Jira application, built with NestJS and fully integrated with AWS (DynamoDB, S3, SNS, SQS, EventBridge, Cognito).

## API Endpoints Mapping

This document maps out all the endpoints that will be built for the Mini-Jira AWS application.
All endpoints (except those marked as **Public**) require a valid Cognito JWT Bearer token.

### 1. Health & Debug
- **`GET /`** (Public)
  - **Purpose:** Health check for the AWS Application Load Balancer.
  - **Roles:** None required.
- **`GET /aws-test`** (Public)
  - **Purpose:** Verifies DynamoDB connection and lists tables.
  - **Roles:** None required.

### 2. Teams
*Every employee belongs to exactly one team. Admin/Manager manages teams.*
- **`POST /teams`**
  - **Purpose:** Create a new team.
  - **Roles:** `Admin`, `Manager`
- **`GET /teams`**
  - **Purpose:** List all teams.
  - **Roles:** Any authenticated user.
- **`GET /teams/:teamId`**
  - **Purpose:** Get a specific team.
  - **Roles:** Any authenticated user.
- **`DELETE /teams/:teamId`**
  - **Purpose:** Delete a team.
  - **Roles:** `Admin`

### 3. Projects
*Managers can create and oversee projects.*
- **`POST /projects`**
  - **Purpose:** Create a new project.
  - **Roles:** `Manager`, `Admin`
- **`GET /projects`**
  - **Purpose:** List all projects.
  - **Roles:** Any authenticated user.
- **`GET /projects/:projectId`**
  - **Purpose:** Get details of a project.
  - **Roles:** Any authenticated user.
- **`PUT /projects/:projectId`**
  - **Purpose:** Update a project.
  - **Roles:** `Manager`, `Admin`
- **`DELETE /projects/:projectId`**
  - **Purpose:** Delete a project.
  - **Roles:** `Manager`, `Admin`

### 4. Tasks (The Core Engine)
*Tasks are assigned to employees on specific teams. Contains S3 image integration and SNS triggers.*
- **`POST /tasks`**
  - **Purpose:** Create a task and upload an optional image attachment to S3. Emits `TaskAssigned` to SNS if assigned.
  - **Roles:** `Manager`
- **`GET /tasks`**
  - **Purpose:** List tasks. 
    - *Server-Side Filtering:* If `Employee`, it strictly returns tasks where `teamId` equals their own team ID. If `Manager`, it returns all tasks (or filtered via query params).
  - **Roles:** Any authenticated user.
- **`GET /tasks/:taskId`**
  - **Purpose:** Get a specific task. Employs `teamId` check.
  - **Roles:** Any authenticated user.
- **`PUT /tasks/:taskId`**
  - **Purpose:** Update a task (e.g., status: To Do -> In Progress). If the assignee is changed, emits SNS. Also handles updating the S3 image attachment.
  - **Roles:** `Manager` (full access) or `Employee` (status updates only).
- **`DELETE /tasks/:taskId`**
  - **Purpose:** Deletes the task from DynamoDB and deletes the corresponding image from S3.
  - **Roles:** `Manager`

### 5. Comments
*Comments on a specific task.*
- **`POST /comments`**
  - **Purpose:** Add a comment to a task. Must be a Manager or belong to the Task's team.
  - **Roles:** Any authenticated user.
- **`GET /comments/:taskId`**
  - **Purpose:** List all comments for a specific task.
  - **Roles:** Any authenticated user.