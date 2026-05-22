// ─────────────────────────────────────────────────────────────
//  Global TypeScript Definitions — Mini-Jira AWS
// ─────────────────────────────────────────────────────────────

export type UserRole      = 'MANAGER' | 'EMPLOYEE' | 'ADMIN';
export type AppMode       = 'api';
export type TaskStatus    = 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriority  = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ProjectStatus = 'Active' | 'On Hold' | 'Completed';
export type ActivityType  = 'STATUS_CHANGED' | 'CREATED' | 'ASSIGNED' | 'COMMENTED' | 'DELETED';

// ─── Session ──────────────────────────────────────────────────
export interface Session {
  userId:       string;
  name:         string;
  email?:       string;
  role:         UserRole;
  teamId:       string;          // empty string for Manager/Admin
  accessToken?: string;
  idToken?:     string;
  profile?:     UserProfile;
  mode:         AppMode;
}

// ─── Core Entities ────────────────────────────────────────────
export interface Task {
  taskId:        string;
  title:         string;
  description:   string;
  status:        TaskStatus;
  priority:      TaskPriority;
  deadline:      string;
  assigneeName:  string;
  assigneeId:    string;
  teamId:        string;
  imageUrl?:     string;
  createdAt:     string;
  updatedAt?:    string;
  closedAt?:     string;
}

export interface Project {
  projectId:   string;
  name:        string;
  description: string;
  status:      ProjectStatus;
  deadline:    string;
  progress:    number;
  managerName: string;
  createdAt?:  string;
}

export interface Comment {
  commentId:  string;
  taskId:     string;
  authorName: string;
  authorId?:  string;
  text:       string;
  createdAt:  string;
}

export interface ActivityLog {
  logId:       string;
  taskId:      string;
  taskTitle:   string;
  actorName:   string;
  actorUserId?: string;
  actionType:  ActivityType;
  fromStatus?: TaskStatus;
  toStatus?:   TaskStatus;
  message:     string;
  createdAt:   string;
  teamId?:     string;
}

export interface UserProfile {
  userId:    string;
  name:      string;
  email:     string;
  role:      UserRole;
  teamId:    string;
  fullName?: string;
  avatar?:   string;
  phoneNumber?: string;
}

// ─── API Shapes ───────────────────────────────────────────────
export interface ApiError {
  message:    string | string[];
  error:      string;
  statusCode: number;
}

export interface LoginResponse {
  accessToken:  string;
  idToken:      string;
  refreshToken: string;
  user: {
    sub:            string;
    email:          string;
    role:           string;
    team:           string;
    fullName:       string;
    username?:      string;
    emailVerified?: boolean;
  };
}

// ─── DTOs ─────────────────────────────────────────────────────
export interface LoginDto {
  email:    string;
  password: string;
}

export interface CreateUserDto {
  email:    string;
  password: string;
  fullName: string;
  role:     UserRole;
  team:     string;
}

export interface CreateTaskDto {
  title:       string;
  description: string;
  priority:    TaskPriority;
  deadline:    string;
  assigneeId:  string;
  teamId:      string;
  imageUrl?:   string;
}

export interface UpdateTaskStatusDto {
  status: TaskStatus;
}

export interface CreateProjectDto {
  name:        string;
  description: string;
  deadline:    string;
}

export interface UpdateProjectDto {
  name?:        string;
  description?: string;
  deadline?:    string;
  status?:      ProjectStatus;
}

export interface UpdateProfileDto {
  fullName?: string;
  avatar?:   string;
  phoneNumber?: string;
}
