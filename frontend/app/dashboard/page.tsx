"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "next/navigation";
import {
  KanbanSquare,
  LayoutDashboard,
  FolderKanban,
  Users2,
  Activity,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  ChevronRight,
  TrendingUp,
  Shield,
  Layers,
  Sun,
  Moon,
  Upload,
  Sparkles,
  Info,
  MessageSquare
} from "lucide-react";

// Types
interface Task {
  taskId: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline: string;
  assigneeName: string;
  assigneeId: string;
  teamId: string;
  imageUrl?: string;
  createdAt: string;
}

interface Project {
  projectId: string;
  name: string;
  description: string;
  status: 'Active' | 'On Hold' | 'Completed';
  deadline: string;
  progress: number;
  managerName: string;
}

interface Comment {
  commentId: string;
  taskId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface ActivityLog {
  logId: string;
  taskId: string;
  taskTitle: string;
  actorName: string;
  actionType: string;
  message: string;
  createdAt: string;
}

// Seed Data
const INITIAL_USERS = [
  { userId: "user-ali", name: "Ali Bin-Ahmed", role: "Manager", teamId: "" },
  { userId: "user-sara", name: "Sara Jenkins", role: "Employee", teamId: "Frontend" },
  { userId: "user-omar", name: "Omar Farooq", role: "Employee", teamId: "Backend" },
  { userId: "user-diana", name: "Diana Prince", role: "Employee", teamId: "QA" },
  { userId: "user-bruce", name: "Bruce Wayne", role: "Admin", teamId: "" }
];

const INITIAL_TASKS: Task[] = [
  {
    taskId: "task-a",
    title: "Implement Landing Page Animations",
    description: "Design and implement premium CSS/Framer motion micro-interactions on the landing page header. Ensure both dark and light modes look flawless and professional.",
    status: "To Do",
    priority: "High",
    deadline: "2026-05-22",
    assigneeName: "Sara Jenkins",
    assigneeId: "user-sara",
    teamId: "Frontend",
    imageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=400&h=200&q=80",
    createdAt: "2026-05-20T10:00:00.000Z"
  },
  {
    taskId: "task-b",
    title: "Connect SQS Queue & SNS Fanout Fan",
    description: "Setup event-driven pipeline on AWS backend to capture task assignment triggers, push notifications to an SQS queue, and dispatch notification emails to assignees.",
    status: "In Progress",
    priority: "Urgent",
    deadline: "2026-05-22",
    assigneeName: "Omar Farooq",
    assigneeId: "user-omar",
    teamId: "Backend",
    createdAt: "2026-05-20T12:00:00.000Z"
  },
  {
    taskId: "task-c",
    title: "Configure AWS CloudFront CDN",
    description: "Setup static distributions for the UI bundle, optimizing low-latency access and configuring origin request headers to match backend CORS requests correctly.",
    status: "In Review",
    priority: "Medium",
    deadline: "2026-05-24",
    assigneeName: "Ali Bin-Ahmed",
    assigneeId: "user-ali",
    teamId: "DevOps",
    createdAt: "2026-05-19T09:00:00.000Z"
  },
  {
    taskId: "task-d",
    title: "Enforce DynamoDB Index Team Query",
    description: "Apply correct teamId global secondary index lookup conditions on backend services, ensuring employee database requests are tightly isolated on server side.",
    status: "Done",
    priority: "High",
    deadline: "2026-05-21",
    assigneeName: "Omar Farooq",
    assigneeId: "user-omar",
    teamId: "Backend",
    createdAt: "2026-05-18T14:00:00.000Z"
  },
  {
    taskId: "task-e",
    title: "Integration Smoke Tests & Cypress Pipeline",
    description: "Implement automated Cypress test scripts to simulate the demo scenarios (Manager vs Team Employee isolation checks) for validation runs.",
    status: "To Do",
    priority: "Low",
    deadline: "2026-05-26",
    assigneeName: "Diana Prince",
    assigneeId: "user-diana",
    teamId: "QA",
    createdAt: "2026-05-21T08:30:00.000Z"
  }
];

const INITIAL_PROJECTS: Project[] = [
  {
    projectId: "project-alpha",
    name: "Mini-Jira AWS Platform",
    description: "Scalable task management app built using high-availability AWS architecture, Cognito auth, DynamoDB, S3, Lambdas, and custom CloudWatch dashboards.",
    status: "Active",
    deadline: "2026-05-22",
    progress: 75,
    managerName: "Ali Bin-Ahmed"
  },
  {
    projectId: "project-beta",
    name: "Enterprise Workspace Migration",
    description: "Data sync automation engine to migrate large scale enterprise workspaces into custom DynamoDB partition tables safely.",
    status: "On Hold",
    deadline: "2026-08-15",
    progress: 30,
    managerName: "Ali Bin-Ahmed"
  }
];

const INITIAL_COMMENTS: Comment[] = [
  {
    commentId: "c-1",
    taskId: "task-b",
    authorName: "Ali Bin-Ahmed",
    text: "Omar, let's verify that the Lambda Assignment Worker drains the queue correctly during load testing.",
    createdAt: "2026-05-20T16:00:00.000Z"
  },
  {
    commentId: "c-2",
    taskId: "task-b",
    authorName: "Omar Farooq",
    text: "Verified! Custom metrics are successfully showing in the CloudWatch dashboard now.",
    createdAt: "2026-05-20T17:30:00.000Z"
  }
];

export default function DashboardPage() {
  const router = useRouter();


  const auth = useAuth();
  // Theme comes from AuthContext
  const theme = auth.theme;
  const setTheme = auth.setTheme;

  // Dynamic user list combining seed data and custom registered sandbox accounts
  const [userList, setUserList] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<typeof INITIAL_USERS[0] | null>(null);

  // Router view controls
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'projects' | 'teams' | 'activity'>('dashboard');
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");

  // App Database states
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // New task inputs
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>("Medium");
  const [newDeadline, setNewDeadline] = useState("2026-05-22");
  const [newTeam, setNewTeam] = useState("Frontend");
  const [newAssignee, setNewAssignee] = useState("Sara Jenkins");
  const [newImage, setNewImage] = useState<string | undefined>(undefined);

  // Discussion comments
  const [commentText, setCommentText] = useState("");

  // Alarm mock status
  const [alarmActive, setAlarmActive] = useState(true);

  // 1. Session Loader: rely on AuthContext (cookie-based)
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.session) {
      router.push('/login');
      return;
    }
    const s = auth.session;
    setCurrentUser({
      userId: s.userId,
      name: s.name,
      role: s.role,
      teamId: s.teamId,
    } as any);

    // Merge any runtime-only custom users from AuthContext mock bank
    try {
      // If AuthContext keeps a mock bank inside, we don't persist it here — keep demo users transient
      setUserList((prev) => {
        const combined = [...prev];
        return combined;
      });
    } catch {
      // ignore
    }

    // Apply theme class (in-memory only)
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, [auth.isLoading, auth.session, theme, router]);

  // Seed initial activities
  useEffect(() => {
    const log: ActivityLog[] = [
      {
        logId: "act-1",
        taskId: "task-d",
        taskTitle: "Enforce DynamoDB Index Team Query",
        actorName: "Omar Farooq",
        actionType: "STATUS_CHANGED",
        message: "Omar Farooq moved task to Done",
        createdAt: "2026-05-21T09:00:00.000Z"
      },
      {
        logId: "act-2",
        taskId: "task-b",
        taskTitle: "Connect SQS Queue & SNS Fanout Fan",
        actorName: "Ali Bin-Ahmed",
        actionType: "ASSIGNED",
        message: "Ali Bin-Ahmed assigned task to Omar Farooq",
        createdAt: "2026-05-20T12:00:00.000Z"
      }
    ];
    setActivities(log);
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center font-bold text-xs text-[var(--text-secondary)]">
        Verifying Cognito Session token...
      </div>
    );
  }

  // Filter Tasks based on ROLE ISOLATION
  const filteredTasks = tasks.filter(task => {
    // Enforce role and GSI isolations:
    const isManagerOrAdmin = currentUser.role === "Manager" || currentUser.role === "Admin" || currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

    // If standard employee, strictly locked to their GSI teamId container
    if (!isManagerOrAdmin) {
      if (task.teamId !== currentUser.teamId) {
        return false;
      }
    }

    // Managers/Admins can filter using team dropdowns
    if (isManagerOrAdmin && teamFilter !== "All") {
      if (task.teamId !== teamFilter) {
        return false;
      }
    }

    // Search query text search
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.assigneeName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    const updated = tasks.map(t => {
      if (t.taskId === taskId) {
        // Enforce employee restrictions (only can update if assigned to them)
        const isManagerOrAdmin = currentUser.role === "Manager" || currentUser.role === "Admin" || currentUser.role === "ADMIN" || currentUser.role === "MANAGER";
        if (!isManagerOrAdmin && t.assigneeId !== currentUser.userId) {
          alert("Team Isolation Rule: Employees can only move tasks assigned to themselves.");
          return t;
        }

        const logEntry: ActivityLog = {
          logId: `act-${Date.now()}`,
          taskId: t.taskId,
          taskTitle: t.title,
          actorName: currentUser.name,
          actionType: "STATUS_CHANGED",
          message: `${currentUser.name} moved "${t.title}" from ${t.status} to ${newStatus}`,
          createdAt: new Date().toISOString()
        };
        setActivities(prev => [logEntry, ...prev]);

        return { ...t, status: newStatus };
      }
      return t;
    });
    setTasks(updated);

    if (selectedTask && selectedTask.taskId === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignee = userList.find(u => u.name === newAssignee) || userList[1];

    const newTask: Task = {
      taskId: `task-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      status: "To Do",
      priority: newPriority,
      deadline: newDeadline,
      assigneeName: newAssignee,
      assigneeId: assignee.userId,
      teamId: newTeam,
      imageUrl: newImage,
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);

    const logEntry: ActivityLog = {
      logId: `act-${Date.now()}`,
      taskId: newTask.taskId,
      taskTitle: newTask.title,
      actorName: currentUser.name,
      actionType: "CREATED",
      message: `${currentUser.name} created task "${newTask.title}" and assigned it to ${newAssignee}`,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [logEntry, ...prev]);

    setNewTitle("");
    setNewDesc("");
    setNewImage(undefined);
    setShowCreateTaskModal(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    const newComment: Comment = {
      commentId: `c-${Date.now()}`,
      taskId: selectedTask.taskId,
      authorName: currentUser.name,
      text: commentText,
      createdAt: new Date().toISOString()
    };

    setComments(prev => [...prev, newComment]);
    setCommentText("");
  };

  const handleImageUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setNewImage(url);
    }
  };

  const handleSignOut = () => {
    auth.logout();
  };

  // Dashboard Stats Calculations
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
  const completedTasks = tasks.filter(t => t.status === "Done").length;
  const inReviewTasks = tasks.filter(t => t.status === "In Review").length;

  const teamDistribution = {
    Frontend: tasks.filter(t => t.teamId === "Frontend").length,
    Backend: tasks.filter(t => t.teamId === "Backend").length,
    QA: tasks.filter(t => t.teamId === "QA").length,
    DevOps: tasks.filter(t => t.teamId === "DevOps").length,
  };

  const isUserLeader = currentUser.role === "Manager" || currentUser.role === "Admin" || currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-all duration-300">

      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col justify-between py-6 px-4 hidden md:flex">
        <div className="flex flex-col gap-8">
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-premium">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-1.5">
                Mini-Jira
                <span className="text-[10px] font-medium py-0.5 px-1.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">AWS</span>
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">Cloud Workspace</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-blue-500/10 text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 hover:text-[var(--text-primary)]'
                }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'board'
                ? 'bg-blue-500/10 text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 hover:text-[var(--text-primary)]'
                }`}
            >
              <KanbanSquare className="h-4 w-4" />
              Kanban Board
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'projects'
                ? 'bg-blue-500/10 text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 hover:text-[var(--text-primary)]'
                }`}
            >
              <FolderKanban className="h-4 w-4" />
              Projects Admin
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'teams'
                ? 'bg-blue-500/10 text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 hover:text-[var(--text-primary)]'
                }`}
            >
              <Users2 className="h-4 w-4" />
              Teams & Users
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'activity'
                ? 'bg-blue-500/10 text-[var(--primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]/30 hover:text-[var(--text-primary)]'
                }`}
            >
              <Activity className="h-4 w-4" />
              Global Audit Log
            </button>
          </nav>
        </div>

        {/* Sidebar Footer (Profile + Theme switcher) */}
        <div className="flex flex-col gap-4 border-t border-[var(--border-color)] pt-4">
          {/* Active user status */}
          <div className="flex items-center gap-3 px-1">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold relative shadow-md">
              {currentUser.name.charAt(0)}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-secondary)]"></span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate leading-4">{currentUser.name}</h4>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mt-0.5">
                {currentUser.role} {currentUser.teamId ? `• ${currentUser.teamId}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-[var(--border-color)]/40 transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-zinc-600" />}
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-[var(--text-secondary)]"
              title="Sign Out of Session"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* 2. TOP NAVBAR */}
        <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-bold capitalize hidden sm:block">
              {activeTab === 'dashboard' ? 'Overview Analytics' : activeTab === 'board' ? 'Kanban Taskboard' : activeTab}
            </h2>

            {/* Quick Demo User Switcher */}
            <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-2.5 py-1 rounded-full border border-[var(--border-color)]">
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Demopage Switcher:</span>
              <select
                value={currentUser?.userId}
                onChange={(e) => {
                  const selected = userList.find(u => u.userId === e.target.value);
                  if (selected) {
                    // Use AuthContext quick-switch for mock users
                    auth.switchUser(selected.userId);
                    setCurrentUser(selected);
                  }
                }}
                className="bg-transparent text-[11px] font-bold text-blue-500 focus:outline-none cursor-pointer border-none"
              >
                {userList.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.role} {u.teamId ? `• ${u.teamId}` : ""})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-60 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all"
              />
            </div>

            {/* CloudWatch Active Alarm Mock Status */}
            <div
              onClick={() => setAlarmActive(!alarmActive)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer select-none transition-all ${alarmActive
                ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-sm animate-pulse"
                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}
              title="Simulates CloudWatch Alarm state on over-due items. Click to toggle state."
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{alarmActive ? "CloudWatch: Overdue Threshold Alert" : "AWS Status: Normal"}</span>
            </div>
          </div>
        </header>

        {/* 3. CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in">

            {/* Employee Team Isolation Notice */}
            {!isUserLeader && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-0.5">Team Isolation Check Activated</h4>
                  <p className="leading-relaxed opacity-90">
                    As an employee on the <strong>{currentUser.teamId} Team</strong>, server-side partition indexing locks your view.
                    Tasks belonging to other teams (Backend, DevOps, etc.) are completely filtered and inaccessible.
                  </p>
                </div>
              </div>
            )}

            {/* A. OVERVIEW DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-6">

                {/* Metric overview grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1 */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex items-center justify-between shadow-premium">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Global Active Tasks</span>
                      <span className="text-3xl font-bold mt-1 tracking-tight">{totalTasks}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-1.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        +3 created today
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-500">
                      <Layers className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex items-center justify-between shadow-premium">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">In Progress Queue</span>
                      <span className="text-3xl font-bold mt-1 tracking-tight text-blue-500">{inProgressTasks}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-blue-500" />
                        Avg resolution time: 4.2h
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex items-center justify-between shadow-premium">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Ready For Review</span>
                      <span className="text-3xl font-bold mt-1 tracking-tight text-amber-500">{inReviewTasks}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        Requires manager approval
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover-lift flex items-center justify-between shadow-premium">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">Done / Archived</span>
                      <span className="text-3xl font-bold mt-1 tracking-tight text-emerald-500">{completedTasks}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        100% SLA uptime
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Dashboard Data Charts & Log Split Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Custom animated Chart Column */}
                  <div className="lg:col-span-2 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold">CloudWatch: Tasks Assigned Per Team</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Reflects partition query GSI statistics</p>
                      </div>
                      <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-blue-500/10 text-[var(--primary)] border border-blue-500/10 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Live
                      </span>
                    </div>

                    {/* Styled custom CSS Chart meters */}
                    <div className="flex flex-col gap-5 py-2">
                      {/* Frontend Progress Bar */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                            Frontend Development Team
                          </span>
                          <span className="font-bold">{teamDistribution.Frontend} assignments</span>
                        </div>
                        <div className="h-3.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden p-0.5 border border-[var(--border-color)]">
                          <div
                            style={{ width: `${(teamDistribution.Frontend / Math.max(totalTasks, 1)) * 100}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-1000 shadow-sm"
                          ></div>
                        </div>
                      </div>

                      {/* Backend Progress Bar */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-violet-500"></span>
                            Backend Services Team
                          </span>
                          <span className="font-bold">{teamDistribution.Backend} assignments</span>
                        </div>
                        <div className="h-3.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden p-0.5 border border-[var(--border-color)]">
                          <div
                            style={{ width: `${(teamDistribution.Backend / Math.max(totalTasks, 1)) * 100}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-1000 shadow-sm"
                          ></div>
                        </div>
                      </div>

                      {/* QA Progress Bar */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-pink-500"></span>
                            QA & Testing Team
                          </span>
                          <span className="font-bold">{teamDistribution.QA} assignments</span>
                        </div>
                        <div className="h-3.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden p-0.5 border border-[var(--border-color)]">
                          <div
                            style={{ width: `${(teamDistribution.QA / Math.max(totalTasks, 1)) * 100}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-1000 shadow-sm"
                          ></div>
                        </div>
                      </div>

                      {/* DevOps Progress Bar */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                            AWS DevOps Cloud Deployments
                          </span>
                          <span className="font-bold">{teamDistribution.DevOps} assignments</span>
                        </div>
                        <div className="h-3.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden p-0.5 border border-[var(--border-color)]">
                          <div
                            style={{ width: `${(teamDistribution.DevOps / Math.max(totalTasks, 1)) * 100}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-1000 shadow-sm"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity audit log sidebar panel */}
                  <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-bold">Event Log Feed</h3>
                      <p className="text-xs text-[var(--text-secondary)]">EventBridge & SQS task dispatch actions</p>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[260px] pr-1 flex flex-col gap-3">
                      {activities.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--text-tertiary)] font-semibold">
                          No recent actions logged.
                        </div>
                      ) : (
                        activities.map((act) => (
                          <div key={act.logId} className="flex gap-3 text-xs leading-5 border-l-2 border-[var(--border-color)] pl-3 py-1">
                            <div className="flex-1">
                              <p className="font-medium text-[var(--text-primary)]">{act.message}</p>
                              <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">
                                {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B. KANBAN TASKBOARD TAB */}
            {activeTab === 'board' && (
              <div className="flex flex-col gap-6">

                {/* Kanban Filters and Quick Board Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4.5 w-4.5 text-[var(--text-secondary)]" />

                    {/* Team Scope Filter dropdown */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">GSI Query Filter:</span>
                      <select
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        disabled={!isUserLeader}
                        className="bg-transparent text-xs font-bold text-[var(--primary)] border-none focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="All">All Company Teams</option>
                        <option value="Frontend">Frontend Team</option>
                        <option value="Backend">Backend Team</option>
                        <option value="QA">QA Team</option>
                        <option value="DevOps">DevOps Cloud Team</option>
                      </select>
                    </div>
                  </div>

                  {/* Create task triggers for Managers/Admins */}
                  {isUserLeader && (
                    <button
                      onClick={() => setShowCreateTaskModal(true)}
                      className="px-4 py-2 text-xs font-semibold bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-90 rounded-xl shadow-premium flex items-center gap-2 cursor-pointer transition-opacity"
                    >
                      <Plus className="h-4 w-4" /> Create Company Task
                    </button>
                  )}
                </div>

                {/* The 4-column Board View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {(['To Do', 'In Progress', 'In Review', 'Done'] as const).map((columnName) => {
                    const columnTasks = filteredTasks.filter(t => t.status === columnName);

                    return (
                      <div key={columnName} className="flex flex-col gap-4">
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                          <h4 className="text-xs font-bold flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${columnName === 'To Do' ? 'bg-zinc-400' :
                              columnName === 'In Progress' ? 'bg-blue-500' :
                                columnName === 'In Review' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}></span>
                            {columnName}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            {columnTasks.length}
                          </span>
                        </div>

                        {/* Column Tasks Holder */}
                        <div className="flex flex-col gap-3 min-h-[450px] p-2.5 rounded-2xl bg-[var(--bg-secondary)]/50 border border-dashed border-[var(--border-color)]">
                          {columnTasks.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center py-20 text-center text-xs text-[var(--text-tertiary)] font-medium">
                              Empty State
                            </div>
                          ) : (
                            columnTasks.map((task) => (
                              <div
                                key={task.taskId}
                                onClick={() => setSelectedTask(task)}
                                className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover-lift cursor-pointer flex flex-col gap-3 shadow-sm group"
                              >
                                {/* Task Badge and Priority bar */}
                                <div className="flex items-center justify-between">
                                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${task.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/15' :
                                    task.priority === 'High' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15' :
                                      task.priority === 'Medium' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/15' :
                                        'bg-zinc-500/10 text-zinc-500 border border-zinc-500/15'
                                    }`}>
                                    {task.priority} Priority
                                  </span>

                                  <span className="text-[10px] font-bold text-blue-500/80 px-2 py-0.5 rounded-md bg-blue-500/5 border border-blue-500/10">
                                    {task.teamId}
                                  </span>
                                </div>

                                {/* Title & Text */}
                                <div>
                                  <h5 className="text-xs font-bold line-clamp-2 leading-5 group-hover:text-[var(--primary)] transition-colors">
                                    {task.title}
                                  </h5>
                                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-3 leading-relaxed mt-1">
                                    {task.description}
                                  </p>
                                </div>

                                {/* Attachments S3 visual seed image */}
                                {task.imageUrl && (
                                  <div className="w-full h-24 rounded-lg overflow-hidden border border-[var(--border-color)]">
                                    <img
                                      src={task.imageUrl}
                                      alt="Thumbnail"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  </div>
                                )}

                                {/* Bottom Info footer */}
                                <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 mt-1 text-[10px] text-[var(--text-secondary)] font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[9px] border border-blue-500/10">
                                      {task.assigneeName.charAt(0)}
                                    </div>
                                    <span className="truncate max-w-[80px]">{task.assigneeName}</span>
                                  </div>

                                  <div className="flex items-center gap-1 font-semibold text-rose-500/80">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{task.deadline}</span>
                                  </div>
                                </div>

                                {/* Drag utility handles / Click Status shifts */}
                                <div className="flex items-center justify-end gap-1.5 border-t border-[var(--border-color)]/50 pt-2.5 mt-0.5">
                                  <span className="text-[9px] font-bold text-[var(--text-tertiary)] mr-auto">Fast Transfer:</span>
                                  {(['To Do', 'In Progress', 'In Review', 'Done'] as const).map((st) => (
                                    st !== task.status && (
                                      <button
                                        key={st}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusChange(task.taskId, st);
                                        }}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] hover:bg-[var(--primary)] hover:text-white transition-colors"
                                      >
                                        {st === 'To Do' ? 'Todo' : st === 'In Progress' ? 'Prog' : st === 'In Review' ? 'Rev' : 'Done'}
                                      </button>
                                    )
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* C. PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <div>
                    <h3 className="text-sm font-bold">Active Company Projects</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Deploy new partition containers across multiple regions</p>
                  </div>
                  {isUserLeader && (
                    <button
                      onClick={() => {
                        const name = prompt("Enter Project Name:");
                        if (name) {
                          const newProj: Project = {
                            projectId: `project-${Date.now()}`,
                            name: name,
                            description: "Automated partition storage container",
                            status: "Active",
                            deadline: "2026-12-31",
                            progress: 10,
                            managerName: currentUser.name
                          };
                          setProjects(prev => [...prev, newProj]);
                        }
                      }}
                      className="px-4 py-2 text-xs font-semibold bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-90 rounded-xl shadow-premium flex items-center gap-2 cursor-pointer transition-opacity"
                    >
                      <Plus className="h-4 w-4" /> Create AWS Project
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((proj) => (
                    <div key={proj.projectId} className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium hover-lift flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm">{proj.name}</h4>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mt-0.5">Managed by {proj.managerName}</span>
                        </div>
                        <span className="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
                          {proj.status}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {proj.description}
                      </p>

                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>Partition Sync Progress</span>
                          <span className="text-[var(--primary)]">{proj.progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-color)]">
                          <div style={{ width: `${proj.progress}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4 mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Deadline: {proj.deadline}</span>
                        <span className="text-blue-500 flex items-center gap-0.5 cursor-pointer hover:underline">View GSI details <ChevronRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. TEAMS TAB */}
            {activeTab === 'teams' && (
              <div className="flex flex-col gap-6">
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <h3 className="text-sm font-bold">AWS Cognito User Directories</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Displays team memberships, attributes, and force password flags</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1: Frontend Team */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-4">
                    <h4 className="font-bold text-xs border-b border-[var(--border-color)] pb-2.5 flex items-center justify-between">
                      Frontend Scope Members
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-500">GSI active</span>
                    </h4>
                    <div className="flex flex-col gap-3">
                      {userList.filter(u => u.teamId === 'Frontend').map(u => (
                        <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                          <div className="h-8 w-8 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold leading-4">{u.name}</h5>
                            <span className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">{u.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Backend Team */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-4">
                    <h4 className="font-bold text-xs border-b border-[var(--border-color)] pb-2.5 flex items-center justify-between">
                      Backend Scope Members
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-500">GSI active</span>
                    </h4>
                    <div className="flex flex-col gap-3">
                      {userList.filter(u => u.teamId === 'Backend').map(u => (
                        <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                          <div className="h-8 w-8 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold leading-4">{u.name}</h5>
                            <span className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">{u.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Manager Directory */}
                  <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-4">
                    <h4 className="font-bold text-xs border-b border-[var(--border-color)] pb-2.5 flex items-center justify-between">
                      Corporate Leadership Directory
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500">Bypass</span>
                    </h4>
                    <div className="flex flex-col gap-3">
                      {userList.filter(u => u.teamId === '').map(u => (
                        <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                          <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold leading-4">{u.name}</h5>
                            <span className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">{u.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* E. GLOBAL AUDIT LOG TAB */}
            {activeTab === 'activity' && (
              <div className="flex flex-col gap-6">
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <h3 className="text-sm font-bold">AWS DynamoDB Audit Table Log</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Immutable records of company mutations, status transitions, and Cognito events</p>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
                        <th className="p-4">Log Index</th>
                        <th className="p-4">Action Type</th>
                        <th className="p-4">Source Task</th>
                        <th className="p-4">Transition Mutation</th>
                        <th className="p-4 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((act, index) => (
                        <tr key={act.logId} className="border-b border-[var(--border-color)] hover:bg-[var(--border-color)]/10 transition-colors">
                          <td className="p-4 font-mono font-bold text-[var(--text-secondary)]">#{index + 1}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${act.actionType === 'STATUS_CHANGED' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                              }`}>
                              {act.actionType}
                            </span>
                          </td>
                          <td className="p-4 font-semibold">{act.taskTitle}</td>
                          <td className="p-4 text-[var(--text-secondary)]">{act.message}</td>
                          <td className="p-4 text-right text-[var(--text-tertiary)] font-medium">
                            {new Date(act.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* 4. MODALS & SLIDE-OVER OVERLAYS */}

      {/* Detail View modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col p-6 gap-6 relative">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/15">
                  Task ID: {selectedTask.taskId}
                </span>
                <h3 className="font-bold text-base mt-2 leading-6">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold bg-[var(--bg-primary)] p-1.5 px-3 rounded-lg border border-[var(--border-color)]"
              >
                Close
              </button>
            </div>

            {/* Layout Grid details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left Column: Metadata specs */}
              <div className="md:col-span-2 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)]">Description Details</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)]">
                    {selectedTask.description}
                  </p>
                </div>

                {/* S3 Attachment Preview */}
                {selectedTask.imageUrl && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)]">S3 Bucket Attachment</h4>
                    <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)] p-2">
                      <img src={selectedTask.imageUrl} alt="S3 attachment" className="w-full h-auto rounded-xl object-contain max-h-[220px]" />
                    </div>
                  </div>
                )}

                {/* Comments section */}
                <div className="flex flex-col gap-4 border-t border-[var(--border-color)] pt-5">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" /> Discussion Comments
                  </h4>

                  {/* Comment List */}
                  <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
                    {comments.filter(c => c.taskId === selectedTask.taskId).length === 0 ? (
                      <p className="text-xs text-[var(--text-tertiary)] italic py-2">No comments posted yet.</p>
                    ) : (
                      comments.filter(c => c.taskId === selectedTask.taskId).map(c => (
                        <div key={c.commentId} className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs flex flex-col gap-1.5">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-[var(--primary)]">{c.authorName}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] font-medium">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type comment message..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 px-4 py-2 text-xs rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-90 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Status and Assignments */}
              <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex flex-col gap-4 text-xs font-medium h-fit">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Status State</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask.taskId, e.target.value as Task['status'])}
                    className="p-2 w-full rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] font-bold text-xs"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Assignee</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[10px]">
                      {selectedTask.assigneeName.charAt(0)}
                    </div>
                    <span className="font-bold">{selectedTask.assigneeName}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Team Access scope</span>
                  <span className="font-bold text-blue-500">{selectedTask.teamId} Team</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Task Deadline</span>
                  <span className="font-bold text-rose-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {selectedTask.deadline}</span>
                </div>

                <div className="flex flex-col gap-1 border-t border-[var(--border-color)] pt-3.5 mt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Created Time</span>
                  <span className="text-[var(--text-tertiary)]">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Create Task modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col p-6 gap-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="font-bold text-base">Create Team Assignment (Manager Access)</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-[var(--text-secondary)] text-sm font-bold bg-[var(--bg-primary)] p-1 px-3.5 rounded-lg border border-[var(--border-color)]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-4 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Task Title</label>
                <input
                  type="text"
                  placeholder="Enter task name details..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Task Description</label>
                <textarea
                  placeholder="Details and implementation rules..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="px-4 py-2.5 h-20 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-xs resize-none"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Priority Rating</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Target Deadline</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Assign To Team (isolation scope)</label>
                  <select
                    value={newTeam}
                    onChange={(e) => {
                      setNewTeam(e.target.value);
                      if (e.target.value === 'Frontend') setNewAssignee('Sara Jenkins');
                      else if (e.target.value === 'Backend') setNewAssignee('Omar Farooq');
                      else if (e.target.value === 'QA') setNewAssignee('Diana Prince');
                      else setNewAssignee('Ali Bin-Ahmed');
                    }}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                  >
                    <option value="Frontend">Frontend Team</option>
                    <option value="Backend">Backend Team</option>
                    <option value="QA">QA Team</option>
                    <option value="DevOps">DevOps Cloud Team</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Individual Assignee</label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                  >
                    {userList.map((u) => (
                      <option key={u.userId} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* S3 image upload mock */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Task Image Attachment (S3 Bucket Upload)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-[var(--border-color)] hover:bg-[var(--bg-primary)]/50 rounded-xl cursor-pointer transition-colors text-[var(--text-secondary)]">
                    <Upload className="h-4 w-4" />
                    <span>Upload image to S3</span>
                    <input type="file" accept="image/*" onChange={handleImageUploadSimulated} className="hidden" />
                  </label>
                  {newImage && (
                    <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> S3 Cache Uploaded!
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 py-3 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 font-bold text-xs rounded-xl shadow-premium cursor-pointer transition-opacity"
              >
                Deploy Task Assignment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

