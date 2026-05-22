// ─────────────────────────────────────────────────────────────
//  Mock Data Service — Dev Sandbox Mode
//  Provides offline demo data when mode = 'mock'.
//  Used for grading demos when AWS may be offline.
// ─────────────────────────────────────────────────────────────

import type {
  Task, Project, Comment, ActivityLog, UserProfile,
} from '@/types';

export const MOCK_USERS: UserProfile[] = [
  {
    userId:   'user-ali',
    name:     'Ali Bin-Ahmed',
    fullName: 'Ali Bin-Ahmed',
    email:    'ali@minijira.dev',
    role:     'MANAGER',
    teamId:   '',
  },
  {
    userId:   'user-sara',
    name:     'Sara Jenkins',
    fullName: 'Sara Jenkins',
    email:    'sara@minijira.dev',
    role:     'EMPLOYEE',
    teamId:   'Frontend',
  },
  {
    userId:   'user-omar',
    name:     'Omar Farooq',
    fullName: 'Omar Farooq',
    email:    'omar@minijira.dev',
    role:     'EMPLOYEE',
    teamId:   'Backend',
  },
  {
    userId:   'user-diana',
    name:     'Diana Prince',
    fullName: 'Diana Prince',
    email:    'diana@minijira.dev',
    role:     'EMPLOYEE',
    teamId:   'QA',
  },
  {
    userId:   'user-bruce',
    name:     'Bruce Wayne',
    fullName: 'Bruce Wayne',
    email:    'bruce@minijira.dev',
    role:     'ADMIN',
    teamId:   '',
  },
];

export const MOCK_TASKS: Task[] = [
  {
    taskId:       'task-a',
    title:        'Implement Landing Page Animations',
    description:  'Design and implement premium CSS micro-interactions on the landing page header. Both dark and light modes must look flawless.',
    status:       'To Do',
    priority:     'High',
    deadline:     '2026-05-28',
    assigneeName: 'Sara Jenkins',
    assigneeId:   'user-sara',
    teamId:       'Frontend',
    imageUrl:     'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&h=200&q=80',
    createdAt:    '2026-05-20T10:00:00.000Z',
  },
  {
    taskId:       'task-b',
    title:        'Connect SQS Queue & SNS Fanout',
    description:  'Setup event-driven pipeline: task assignment triggers publish to SNS which fans out to SQS queue and dispatches email notifications to assignees.',
    status:       'In Progress',
    priority:     'Urgent',
    deadline:     '2026-05-22',
    assigneeName: 'Omar Farooq',
    assigneeId:   'user-omar',
    teamId:       'Backend',
    createdAt:    '2026-05-20T12:00:00.000Z',
  },
  {
    taskId:       'task-c',
    title:        'Configure AWS CloudFront CDN',
    description:  'Setup static distributions for the UI bundle, configure origin request headers to match backend CORS rules.',
    status:       'In Review',
    priority:     'Medium',
    deadline:     '2026-05-24',
    assigneeName: 'Ali Bin-Ahmed',
    assigneeId:   'user-ali',
    teamId:       'DevOps',
    createdAt:    '2026-05-19T09:00:00.000Z',
  },
  {
    taskId:       'task-d',
    title:        'Enforce DynamoDB GSI Team Query',
    description:  'Apply correct teamId GSI lookup conditions on backend services ensuring all employee database requests are server-side isolated.',
    status:       'Done',
    priority:     'High',
    deadline:     '2026-05-21',
    assigneeName: 'Omar Farooq',
    assigneeId:   'user-omar',
    teamId:       'Backend',
    createdAt:    '2026-05-18T14:00:00.000Z',
    closedAt:     '2026-05-21T09:00:00.000Z',
  },
  {
    taskId:       'task-e',
    title:        'Cypress Integration Smoke Tests',
    description:  'Implement automated Cypress scripts simulating Manager vs Employee isolation scenarios for validation and demo-day runs.',
    status:       'To Do',
    priority:     'Low',
    deadline:     '2026-05-26',
    assigneeName: 'Diana Prince',
    assigneeId:   'user-diana',
    teamId:       'QA',
    createdAt:    '2026-05-21T08:30:00.000Z',
  },
  {
    taskId:       'task-f',
    title:        'Optimize React Query Cache Strategy',
    description:  'Review and optimize client-side data fetching patterns, reduce redundant API calls, improve dashboard perceived performance.',
    status:       'In Progress',
    priority:     'Medium',
    deadline:     '2026-05-25',
    assigneeName: 'Sara Jenkins',
    assigneeId:   'user-sara',
    teamId:       'Frontend',
    createdAt:    '2026-05-21T11:00:00.000Z',
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    projectId:   'project-alpha',
    name:        'Mini-Jira AWS Platform',
    description: 'Scalable task management app built on high-availability AWS architecture — Cognito, DynamoDB GSIs, S3/Lambda, SQS/SNS, CloudWatch.',
    status:      'Active',
    deadline:    '2026-05-22',
    progress:    75,
    managerName: 'Ali Bin-Ahmed',
    createdAt:   '2026-05-01T00:00:00.000Z',
  },
  {
    projectId:   'project-beta',
    name:        'Enterprise Workspace Migration',
    description: 'Data sync automation engine to migrate large-scale enterprise workspaces into custom DynamoDB partition tables safely.',
    status:      'On Hold',
    deadline:    '2026-08-15',
    progress:    30,
    managerName: 'Ali Bin-Ahmed',
    createdAt:   '2026-04-15T00:00:00.000Z',
  },
  {
    projectId:   'project-gamma',
    name:        'CloudWatch Analytics Dashboard',
    description: 'Real-time monitoring showing EC2 CPU, task metrics, and alarms with custom CloudWatch widgets and auto-alerting.',
    status:      'Active',
    deadline:    '2026-06-30',
    progress:    45,
    managerName: 'Ali Bin-Ahmed',
    createdAt:   '2026-05-10T00:00:00.000Z',
  },
];

export const MOCK_COMMENTS: Comment[] = [
  {
    commentId:  'c-1',
    taskId:     'task-b',
    authorName: 'Ali Bin-Ahmed',
    authorId:   'user-ali',
    text:       "Omar, let's verify the Lambda Assignment Worker drains the queue correctly during load testing.",
    createdAt:  '2026-05-20T16:00:00.000Z',
  },
  {
    commentId:  'c-2',
    taskId:     'task-b',
    authorName: 'Omar Farooq',
    authorId:   'user-omar',
    text:       'Verified! Custom metrics now showing in CloudWatch dashboard.',
    createdAt:  '2026-05-20T17:30:00.000Z',
  },
  {
    commentId:  'c-3',
    taskId:     'task-a',
    authorName: 'Ali Bin-Ahmed',
    authorId:   'user-ali',
    text:       'Sara, please ensure animations degrade gracefully on mobile and low-power devices.',
    createdAt:  '2026-05-21T09:00:00.000Z',
  },
];

export const MOCK_ACTIVITY: ActivityLog[] = [
  {
    logId:      'act-1',
    taskId:     'task-d',
    taskTitle:  'Enforce DynamoDB GSI Team Query',
    actorName:  'Omar Farooq',
    actorUserId:'user-omar',
    actionType: 'STATUS_CHANGED',
    fromStatus: 'In Review',
    toStatus:   'Done',
    message:    'Omar Farooq moved task to Done',
    createdAt:  '2026-05-21T09:00:00.000Z',
  },
  {
    logId:      'act-2',
    taskId:     'task-b',
    taskTitle:  'Connect SQS Queue & SNS Fanout',
    actorName:  'Ali Bin-Ahmed',
    actorUserId:'user-ali',
    actionType: 'ASSIGNED',
    message:    'Ali Bin-Ahmed assigned task to Omar Farooq',
    createdAt:  '2026-05-20T12:00:00.000Z',
  },
  {
    logId:      'act-3',
    taskId:     'task-a',
    taskTitle:  'Implement Landing Page Animations',
    actorName:  'Ali Bin-Ahmed',
    actorUserId:'user-ali',
    actionType: 'CREATED',
    message:    'Ali Bin-Ahmed created task and assigned to Sara Jenkins',
    createdAt:  '2026-05-20T10:00:00.000Z',
  },
];

/** Returns tasks filtered by role + optional team filter */
export function getMockTasksForUser(
  role:       string,
  teamId:     string,
  teamFilter?: string,
): Task[] {
  const isLeader = role === 'MANAGER' || role === 'ADMIN';
  let tasks = [...MOCK_TASKS];

  if (!isLeader) {
    tasks = tasks.filter((t) => t.teamId === teamId);
  } else if (teamFilter && teamFilter !== 'All') {
    tasks = tasks.filter((t) => t.teamId === teamFilter);
  }
  return tasks;
}
