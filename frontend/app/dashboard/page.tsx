"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TaskImageUpload } from "@/features/components/task-image-upload";
import { taskDisplayImageUrl } from "@/features/utils/task-image-upload";
import {
  assigneesForTaskDropdown,
  filterUsersForTeam,
  pickDefaultAssigneeId,
  toAssigneeCandidate,
  dedupeAssignees,
  type AssigneeCandidate,
} from "@/features/utils/team-assignees";
import { tasksService } from "@/services/tasks.service";
import { usersService } from "@/services/users.service";
import { projectsService } from "@/services/projects.service";
import { metricsService } from "@/services/metrics.service";
import { teamsService, type Team } from "@/services/teams.service";
import { commentsService } from "@/services/comments.service";
import { auditLogsService } from "@/services/audit-logs.service";
import { useToast } from "@/context/ToastContext";
import type { TaskStatus } from "@/types";
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
  Upload,
  Sparkles,
  Info,
  MessageSquare,
  Trash2,
} from "lucide-react";

// Types
interface Task {
  taskId: string;
  title: string;
  description: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  deadline: string;
  assigneeName?: string;
  assigneeId: string;
  teamId: string;
  imageKey?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface Project {
  projectId: string;
  name: string;
  description: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'ACTIVE' | 'COMPLETED';
  deadline: string;
  progress: number;
  managerName: string;
  assignedUserIds?: string[];
  assignedTeamIds?: string[];
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

interface DashboardUser {
  userId: string;
  name: string;
  role: string;
  teamId: string;
}

function mapApiUser(u: {
  userId: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  teamId?: string;
}): DashboardUser {
  return {
    userId: u.userId,
    name: u.fullName || u.name || u.email?.split("@")[0] || "User",
    role: String(u.role || "EMPLOYEE"),
    teamId: u.teamId || "",
  };
}

function mapApiProject(p: Record<string, unknown>): Project {
  return {
    projectId: String(p.projectId),
    name: String(p.name ?? "Untitled"),
    description: String(p.description ?? ""),
    status: (p.status as Project["status"]) || "Active",
    deadline: String(p.deadline ?? ""),
    progress: Number(p.progress ?? 0),
    managerName: String(p.managerName ?? p.createdBy ?? "—"),
  };
}

function displayAssignee(task: Task): string {
  return task.assigneeName || task.assigneeId || "Unassigned";
}

type DashboardTab = 'dashboard' | 'board' | 'projects' | 'teams' | 'activity';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { pushToast } = useToast();

  const auth = useAuth();
  // Theme comes from AuthContext
  const theme = auth.theme;
  const setTheme = auth.setTheme;

  // Dynamic user list combining seed data and custom registered sandbox accounts
  const [userList, setUserList] = useState<DashboardUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const dashboardDataLoadedFor = useRef<string | null>(null);

  const currentUser = useMemo<DashboardUser | null>(() => {
    if (!auth.session) {
      return null;
    }

    return {
      userId: auth.session.userId,
      name: auth.session.name,
      role: auth.session.role,
      teamId: auth.isEmployee ? auth.session.teamId : '',
    };
  }, [auth.session, auth.isEmployee]);

  // Router view controls
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    pathname.endsWith('/dashboard/tasks') ? 'board' : 'dashboard',
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");

  // App Database states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectActionLoading, setProjectActionLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsSummary, setMetricsSummary] = useState<{
    totalTasks: number;
    openTasks: number;
    closedTasks: number;
    cpuUtilization: number | null;
    ec2InstanceIdConfigured?: boolean;
    averageTimeToCloseHours?: number | null;
  } | null>(null);
  const [metricsTimeSeries, setMetricsTimeSeries] = useState<Array<{
    date: string;
    created: number;
    closed: number;
    closedByTeam?: Record<string, number>;
  }>>([]);

  // New task inputs
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>("Medium");
  const [newDeadline, setNewDeadline] = useState("2026-05-22");
  const [newTeam, setNewTeam] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newImageKey, setNewImageKey] = useState<string | undefined>(undefined);
  const [newImagePreview, setNewImagePreview] = useState<string | undefined>(undefined);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [teamAssignees, setTeamAssignees] = useState<AssigneeCandidate[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const createFormDefaultsSet = useRef(false);
  const assigneesFetchGen = useRef(0);

  const orgAssignees = useMemo(
    () =>
      dedupeAssignees(
        userList.map((u) =>
          toAssigneeCandidate({
            userId: u.userId,
            name: u.name,
            role: u.role,
            teamId: u.teamId,
          }),
        ),
      ),
    [userList],
  );

  const createTaskAssigneeOptions = useMemo(
    () => assigneesForTaskDropdown(teamAssignees),
    [teamAssignees],
  );

  const loadTasksFromApi = useCallback(async () => {
    setTasksLoading(true);
    try {
      const teamQs =
        teamFilter !== "All" && teamFilter ? teamFilter : undefined;
      const data = await tasksService.getAll(teamQs);
      setTasks(
        data.map((t) => ({
          ...t,
          assigneeName: t.assigneeName || t.assigneeId,
        })) as Task[],
      );
    } catch (e) {
      pushToast(
        "error",
        "Failed to load tasks",
        e instanceof Error ? e.message : "Check backend and Cognito session",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [teamFilter, pushToast]);

  const loadDashboardData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [usersData, projectsData, teamsData] = await Promise.all([
        usersService.getAll(),
        projectsService.getAll(),
        teamsService.getAll(),
      ]);

      const mappedUsers = usersData.map((u) => mapApiUser(u));
      setUserList(mappedUsers);
      setProjects(
        projectsData.map((p) =>
          mapApiProject(p as unknown as Record<string, unknown>),
        ),
      );
      setTeams(teamsData);
      if (!createFormDefaultsSet.current && teamsData.length > 0) {
        createFormDefaultsSet.current = true;
        setNewTeam(teamsData[0].teamId);
      }

      await loadTasksFromApi();
    } catch (e) {
      pushToast(
        "error",
        "Failed to load dashboard data",
        e instanceof Error ? e.message : "Ensure backend is running",
      );
    } finally {
      setDataLoading(false);
    }
  }, [loadTasksFromApi, pushToast]);

  const loadMetricsFromApi = useCallback(async () => {
    if (!auth.isManager && !auth.isAdmin) {
      setMetricsSummary(null);
      setMetricsTimeSeries([]);
      setMetricsError(null);
      return;
    }

    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const [summary, timeSeries] = await Promise.all([
        metricsService.getDashboardSummary(),
        metricsService.getTimeSeries(),
      ]);
      setMetricsSummary(summary);
      setMetricsTimeSeries(timeSeries);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Metrics API did not return dashboard data";
      setMetricsError(message);
      pushToast("error", "Metrics unavailable", message);
    } finally {
      setMetricsLoading(false);
    }
  }, [auth.isManager, auth.isAdmin, pushToast]);

  // Discussion comments
  const [commentText, setCommentText] = useState("");
  const [taskHistory, setTaskHistory] = useState<ActivityLog[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // CloudWatch alarm setup is AWS-side proof; this UI does not fake alarm state.

  // 1. Session Loader: rely on AuthContext (cookie-based)
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.session) {
      router.push('/login');
      return;
    }

    // Apply theme class (in-memory only)
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, [auth.isLoading, auth.session, theme, router]);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.session) {
      dashboardDataLoadedFor.current = null;
      return;
    }

    const sessionKey = auth.session.userId || auth.session.email || 'authenticated';
    if (dashboardDataLoadedFor.current === sessionKey) return;

    dashboardDataLoadedFor.current = sessionKey;
    void loadDashboardData();
    void loadMetricsFromApi();
  }, [
    auth.isLoading,
    auth.session?.userId,
    auth.session?.email,
    loadDashboardData,
    loadMetricsFromApi,
  ]);

  useEffect(() => {
    if (!auth.isLoading && auth.session) {
      void loadTasksFromApi();
    }
  }, [teamFilter, auth.isLoading, auth.session, loadTasksFromApi]);

  const loadActivities = useCallback(async () => {
    if (!auth.session || !currentUser) return;
    try {
      if (auth.isManager || auth.isAdmin) {
        const logs = await auditLogsService.getAll();
        setActivities(logs);
      } else if (currentUser.teamId) {
        const logs = await auditLogsService.getRecentForTeam(currentUser.teamId);
        setActivities(logs);
      } else {
        setActivities([]);
      }
    } catch (e) {
      pushToast(
        "error",
        "Activity log",
        e instanceof Error ? e.message : "Failed to load audit log",
      );
    }
  }, [auth.session, auth.isManager, auth.isAdmin, currentUser, pushToast]);

  const loadCommentsForTask = useCallback(
    async (taskId: string) => {
      setCommentsLoading(true);
      try {
        const list = await commentsService.getByTaskId(taskId);
        setComments((prev) => {
          const others = prev.filter((c) => c.taskId !== taskId);
          return [...others, ...list];
        });
      } catch (e) {
        pushToast(
          "error",
          "Comments",
          e instanceof Error ? e.message : "Failed to load comments",
        );
      } finally {
        setCommentsLoading(false);
      }
    },
    [pushToast],
  );

  const loadTaskHistory = useCallback(
    async (taskId: string) => {
      try {
        const logs = await auditLogsService.getTaskHistory(taskId);
        setTaskHistory(logs);
      } catch {
        setTaskHistory([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (!auth.isLoading && auth.session && currentUser) {
      void loadActivities();
    }
  }, [auth.isLoading, auth.session, currentUser, loadActivities]);

  useEffect(() => {
    if (selectedTask) {
      void loadCommentsForTask(selectedTask.taskId);
      void loadTaskHistory(selectedTask.taskId);
    } else {
      setTaskHistory([]);
    }
  }, [selectedTask, loadCommentsForTask, loadTaskHistory]);

  const openCreateTaskModal = useCallback(() => {
    const teamWithMembers =
      teams.find((t) => filterUsersForTeam(orgAssignees, t.teamId, teams).length > 0) ??
      teams[0];
    const teamId = teamWithMembers?.teamId ?? newTeam;
    if (teamId) {
      setNewTeam(teamId);
    }
    setShowCreateTaskModal(true);
  }, [teams, orgAssignees, newTeam]);

  useEffect(() => {
    if (!showCreateTaskModal) {
      setAssigneesLoading(false);
      return;
    }
    if (!newTeam) {
      setTeamAssignees([]);
      setNewAssigneeId("");
      return;
    }

    const fetchGen = ++assigneesFetchGen.current;
    const teamId = newTeam;

    (async () => {
      const local = filterUsersForTeam(orgAssignees, teamId, teams);
      if (local.length > 0) {
        setTeamAssignees(local);
        setNewAssigneeId((prev) => {
          const options = assigneesForTaskDropdown(local);
          if (prev && options.some((o) => o.userId === prev)) {
            return prev;
          }
          return pickDefaultAssigneeId(local);
        });
      } else {
        setAssigneesLoading(true);
      }

      let apiMapped: AssigneeCandidate[] = [];

      try {
        const apiUsers = await usersService.getByTeam(teamId);
        apiMapped = dedupeAssignees(
          apiUsers.map((u) =>
            toAssigneeCandidate({
              userId: u.userId,
              fullName: u.fullName,
              name: u.name,
              email: u.email,
              role: u.role,
              teamId: u.teamId,
            }),
          ),
        );
      } catch (err) {
        if (fetchGen === assigneesFetchGen.current) {
          pushToast(
            "error",
            "Could not load team members",
            err instanceof Error ? err.message : "Check manager role and login",
          );
        }
      }

      if (fetchGen !== assigneesFetchGen.current) {
        return;
      }

      const members = dedupeAssignees([...apiMapped, ...local]);
      setTeamAssignees(members);
      setNewAssigneeId((prev) => {
        const options = assigneesForTaskDropdown(members);
        if (prev && options.some((o) => o.userId === prev)) {
          return prev;
        }
        return pickDefaultAssigneeId(members);
      });
      setAssigneesLoading(false);
    })();

    return () => {
      assigneesFetchGen.current += 1;
    };
  }, [showCreateTaskModal, newTeam, orgAssignees, teams, pushToast]);

  const teamDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const team of teams) {
      counts[team.teamId] = tasks.filter((t) => t.teamId === team.teamId).length;
    }
    return counts;
  }, [teams, tasks]);

  const closedByTeamFromMetrics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const point of metricsTimeSeries) {
      for (const [teamId, count] of Object.entries(point.closedByTeam ?? {})) {
        counts[teamId] = (counts[teamId] ?? 0) + count;
      }
    }
    return counts;
  }, [metricsTimeSeries]);

  const recentMetricDays = useMemo(
    () => metricsTimeSeries.slice(-5),
    [metricsTimeSeries],
  );

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
    const isManagerOrAdmin = auth.isManager || auth.isAdmin;

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
        displayAssignee(task).toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const isManagerOrAdmin = auth.isManager || auth.isAdmin;

    const target = tasks.find((t) => t.taskId === taskId);
    if (!target) return;

    if (!isManagerOrAdmin && target.assigneeId !== currentUser.userId) {
      pushToast(
        "error",
        "Not allowed",
        "Employees can only move tasks assigned to themselves.",
      );
      return;
    }

    try {
      const res = await tasksService.updateStatus(taskId, newStatus as TaskStatus);
      const updatedTask = (res.task || {
        ...target,
        status: newStatus,
      }) as Task;

      setTasks((prev) =>
        prev.map((t) => (t.taskId === taskId ? { ...t, ...updatedTask } : t)),
      );
      if (selectedTask?.taskId === taskId) {
        setSelectedTask({ ...selectedTask, ...updatedTask });
      }
      pushToast("success", "Status updated", res.message);
      await loadTasksFromApi();
      await loadActivities();
      if (selectedTask?.taskId === taskId) {
        await loadTaskHistory(taskId);
      }
    } catch (e) {
      pushToast(
        "error",
        "Update failed",
        e instanceof Error ? e.message : "Could not update status",
      );
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignee = createTaskAssigneeOptions.find(
      (u) => u.userId === newAssigneeId,
    );
    if (!assignee || !newTeam) {
      pushToast(
        "error",
        "No assignee",
        "Select a team with at least one member, or assign users to that team in DynamoDB.",
      );
      return;
    }

    setIsCreatingTask(true);
    try {
      const created = await tasksService.create({
        title: newTitle.trim(),
        description: newDesc.trim() || "—",
        priority: newPriority,
        deadline: new Date(newDeadline).toISOString(),
        assigneeId: assignee.userId,
        assigneeName: assignee.name,
        teamId: newTeam,
        ...(newImageKey ? { imageKey: newImageKey } : {}),
      });

      const taskTitle =
        (created as { title?: string }).title ?? newTitle.trim();
      pushToast("success", "Task created", `"${taskTitle}" saved`);
      await loadTasksFromApi();
      await loadActivities();
    } catch (err) {
      pushToast(
        "error",
        "Create failed",
        err instanceof Error ? err.message : "Manager role required",
      );
      return;
    } finally {
      setIsCreatingTask(false);
    }

    setNewTitle("");
    setNewDesc("");
    setNewImageKey(undefined);
    setNewImagePreview(undefined);
    setNewAssigneeId("");
    setShowCreateTaskModal(false);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask || !isUserLeader) return;

    const confirmed = window.confirm(
      `Delete task "${selectedTask.title}"? This removes it from DynamoDB and deletes S3 images.`,
    );
    if (!confirmed) return;

    setIsDeletingTask(true);
    try {
      await tasksService.remove(selectedTask.taskId);
      setTasks((prev) => prev.filter((t) => t.taskId !== selectedTask.taskId));
      setComments((prev) => prev.filter((c) => c.taskId !== selectedTask.taskId));
      setSelectedTask(null);
      await loadActivities();
      pushToast("success", "Task deleted", `"${selectedTask.title}" was removed`);
    } catch (err) {
      pushToast(
        "error",
        "Delete failed",
        err instanceof Error ? err.message : "Manager or admin role required",
      );
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleCreateProjectFromTab = async () => {
    if (!isUserLeader) return;
    const name = window.prompt("Enter Project Name:");
    if (!name?.trim()) return;
    const description = window.prompt("Project description (optional):") || "";

    setProjectActionLoading(true);
    try {
      const created = await projectsService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        status: "ACTIVE",
      });
      setProjects((prev) => [
        mapApiProject(created as unknown as Record<string, unknown>),
        ...prev,
      ]);
      pushToast("success", "Project created", `"${created.name}" saved to DynamoDB`);
    } catch (err) {
      pushToast(
        "error",
        "Project create failed",
        err instanceof Error ? err.message : "Manager/Admin role required",
      );
    } finally {
      setProjectActionLoading(false);
    }
  };

  const handleEditProjectFromTab = async (project: Project) => {
    if (!isUserLeader) return;
    const name = window.prompt("Project name:", project.name);
    if (!name?.trim()) return;
    const description = window.prompt("Project description:", project.description) ?? project.description;

    setProjectActionLoading(true);
    try {
      const updated = await projectsService.update(project.projectId, {
        name: name.trim(),
        description,
        status: project.status === "COMPLETED" || project.status === "Completed" ? "COMPLETED" : "ACTIVE",
      });
      const mapped = mapApiProject(updated as unknown as Record<string, unknown>);
      setProjects((prev) =>
        prev.map((item) => (item.projectId === mapped.projectId ? mapped : item)),
      );
      pushToast("success", "Project updated", `"${mapped.name}" saved to DynamoDB`);
    } catch (err) {
      pushToast(
        "error",
        "Project update failed",
        err instanceof Error ? err.message : "Manager/Admin role required",
      );
    } finally {
      setProjectActionLoading(false);
    }
  };

  const handleDeleteProjectFromTab = async (project: Project) => {
    if (!isUserLeader) return;
    if (!window.confirm(`Delete project "${project.name}" from DynamoDB?`)) return;

    setProjectActionLoading(true);
    try {
      await projectsService.remove(project.projectId);
      setProjects((prev) => prev.filter((item) => item.projectId !== project.projectId));
      pushToast("success", "Project deleted", `"${project.name}" was removed`);
    } catch (err) {
      pushToast(
        "error",
        "Project delete failed",
        err instanceof Error ? err.message : "Manager/Admin role required",
      );
    } finally {
      setProjectActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      await commentsService.create({
        taskId: selectedTask.taskId,
        text: commentText.trim(),
      });
      setCommentText("");
      await loadCommentsForTask(selectedTask.taskId);
      await loadTaskHistory(selectedTask.taskId);
      await loadActivities();
      pushToast("success", "Comment posted", "Saved to DynamoDB");
    } catch (err) {
      pushToast(
        "error",
        "Comment failed",
        err instanceof Error ? err.message : "Could not post comment",
      );
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

  const isUserLeader = auth.isManager || auth.isAdmin;

  return (
    <div className="cloud-page flex min-h-screen text-[#202633] transition-all duration-300">

      {/* 1. LEFT SIDEBAR */}
      <aside className="cloud-card m-4 w-64 rounded-[28px] flex flex-col justify-between py-6 px-4 hidden md:flex">
        <div className="flex flex-col gap-8">
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="cloud-logo p-2.5 rounded-xl text-white shadow-premium">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-1.5">
                CloudJira
                <span className="text-[10px] font-medium py-0.5 px-1.5 bg-white/50 text-[#A21BF4] rounded-full border border-white/70">AWS</span>
              </h1>
              <p className="text-xs text-[#475569]">Cloud Workspace</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-white/54 text-[#A21BF4] shadow-sm'
                : 'text-[#475569] hover:bg-white/36 hover:text-[#202633]'
                }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'board'
                ? 'bg-white/54 text-[#A21BF4] shadow-sm'
                : 'text-[#475569] hover:bg-white/36 hover:text-[#202633]'
                }`}
            >
              <KanbanSquare className="h-4 w-4" />
              Kanban Board
            </button>
            <button
              onClick={() => router.push('/dashboard/projects')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'projects'
                ? 'bg-white/54 text-[#A21BF4] shadow-sm'
                : 'text-[#475569] hover:bg-white/36 hover:text-[#202633]'
                }`}
            >
              <FolderKanban className="h-4 w-4" />
              Projects Admin
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'teams'
                ? 'bg-white/54 text-[#A21BF4] shadow-sm'
                : 'text-[#475569] hover:bg-white/36 hover:text-[#202633]'
                }`}
            >
              <Users2 className="h-4 w-4" />
              Teams & Users
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'activity'
                ? 'bg-white/54 text-[#A21BF4] shadow-sm'
                : 'text-[#475569] hover:bg-white/36 hover:text-[#202633]'
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
          <button
            type="button"
            onClick={() => router.push('/dashboard/profile')}
            className="flex items-center gap-3 rounded-2xl px-2 py-1 text-left transition-all hover:bg-white/32 hover:shadow-sm"
          >
            <div className="cloud-logo h-10 w-10 rounded-full text-white flex items-center justify-center font-bold relative shadow-md">
              {currentUser.name.charAt(0)}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-secondary)]"></span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate leading-4">{currentUser.name}</h4>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mt-0.5">
                {currentUser.role} {currentUser.teamId ? `• ${currentUser.teamId}` : ""}
              </span>
            </div>
          </button>

          <div className="flex items-center justify-between gap-3 px-1">
            <ThemeToggle
              theme={theme}
              onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="scale-[0.72] origin-left"
            />

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
        <header className="cloud-nav m-4 mb-0 h-16 rounded-[24px] sticky top-4 z-30 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-bold capitalize hidden sm:block">
              {activeTab === 'dashboard' ? 'Overview Analytics' : activeTab === 'board' ? 'Kanban Taskboard' : activeTab}
            </h2>

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
                className="pl-9 pr-4 py-2 w-60 rounded-full border border-white/70 bg-white/42 text-xs placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#C832FF]/30 transition-all"
              />
            </div>

            {/* CloudWatch alarm proof is AWS-side and should not be faked in the UI. */}
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-600 border-amber-500/20"
              title="CloudWatch alarm setup/proof is not exposed by the current backend API."
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>CloudWatch alarm proof pending</span>
            </div>
          </div>
        </header>

        {/* 3. CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
                        Backend metrics shown below
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
                        Avg time-to-close shown below
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

                {/* Real backend metrics surfaced additively; missing CloudWatch config is shown honestly. */}
                {isUserLeader && (
                  <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold">Backend Metrics / CloudWatch Signals</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Uses protected Metrics API data. Missing AWS-side alarm proof is not simulated.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadMetricsFromApi()}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                      >
                        Refresh metrics
                      </button>
                    </div>

                    {metricsLoading ? (
                      <p className="text-xs text-[var(--text-secondary)]">Loading backend metrics...</p>
                    ) : metricsError ? (
                      <p className="text-xs text-rose-500">{metricsError}</p>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Tasks created per day</p>
                          {recentMetricDays.length === 0 ? (
                            <p className="mt-3 text-xs text-[var(--text-tertiary)]">No created-task metric data returned yet.</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {recentMetricDays.map((point) => (
                                <div key={point.date} className="flex items-center justify-between text-xs">
                                  <span>{point.date}</span>
                                  <span className="font-bold">{point.created}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Closed per team</p>
                          {Object.keys(closedByTeamFromMetrics).length === 0 ? (
                            <p className="mt-3 text-xs text-[var(--text-tertiary)]">No per-team closed-task data returned yet.</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {Object.entries(closedByTeamFromMetrics).map(([teamId, count]) => (
                                <div key={teamId} className="flex items-center justify-between text-xs">
                                  <span>{teams.find((t) => t.teamId === teamId)?.name || teamId}</span>
                                  <span className="font-bold">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Avg time to close</p>
                          {metricsSummary?.averageTimeToCloseHours == null ? (
                            <p className="mt-3 text-xs text-[var(--text-tertiary)]">No closed-task timing data available yet.</p>
                          ) : (
                            <p className="mt-3 text-2xl font-bold">{metricsSummary.averageTimeToCloseHours}h</p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">EC2 CPU</p>
                          {!metricsSummary?.ec2InstanceIdConfigured ? (
                            <p className="mt-3 text-xs text-[var(--text-tertiary)]">EC2_INSTANCE_ID is not configured for the Metrics API.</p>
                          ) : metricsSummary.cpuUtilization == null ? (
                            <p className="mt-3 text-xs text-[var(--text-tertiary)]">No CloudWatch CPU datapoint returned for the configured instance.</p>
                          ) : (
                            <p className="mt-3 text-2xl font-bold">{metricsSummary.cpuUtilization.toFixed(2)}%</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Dashboard Data Charts & Log Split Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Custom animated Chart Column */}
                  <div className="lg:col-span-2 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold">Tasks Assigned Per Team</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Computed from backend task data returned for this user</p>
                      </div>
                      <span className="text-xs font-semibold py-1 px-2.5 rounded-full bg-blue-500/10 text-[var(--primary)] border border-blue-500/10 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Backend data
                      </span>
                    </div>

                    <div className="flex flex-col gap-5 py-2">
                      {Object.keys(teamDistribution).length === 0 ? (
                        <p className="text-xs text-[var(--text-secondary)]">No teams in DynamoDB yet.</p>
                      ) : (
                        Object.entries(teamDistribution).map(([teamId, count], index) => {
                          const barColors = [
                            "from-teal-500 to-cyan-400",
                            "from-violet-500 to-purple-400",
                            "from-pink-500 to-rose-400",
                            "from-sky-500 to-blue-400",
                          ];
                          const dotColors = ["bg-teal-400", "bg-violet-500", "bg-pink-500", "bg-sky-500"];
                          const label = teams.find((t) => t.teamId === teamId)?.name || teamId;
                          return (
                            <div key={teamId} className="flex flex-col gap-2">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="flex items-center gap-2">
                                  <span className={`h-2 w-2 rounded-full ${dotColors[index % dotColors.length]}`}></span>
                                  {label}
                                </span>
                                <span className="font-bold">{count} assignments</span>
                              </div>
                              <div className="h-3.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden p-0.5 border border-[var(--border-color)]">
                                <div
                                  style={{ width: `${(count / Math.max(totalTasks, 1)) * 100}%` }}
                                  className={`h-full rounded-full bg-gradient-to-r ${barColors[index % barColors.length]} transition-all duration-1000 shadow-sm`}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Activity audit log sidebar panel */}
                  <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-premium flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-bold">Event Log Feed</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Backend audit log actions</p>
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
                        {teams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>
                            {t.name || t.teamId}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Create task triggers for Managers/Admins */}
                  {isUserLeader && (
                    <button
                      onClick={openCreateTaskModal}
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
                                {taskDisplayImageUrl(task) && (
                                  <div className="w-full h-24 rounded-lg overflow-hidden border border-[var(--border-color)]">
                                    <img
                                      src={taskDisplayImageUrl(task)}
                                      alt="Thumbnail"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  </div>
                                )}

                                {/* Bottom Info footer */}
                                <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3 mt-1 text-[10px] text-[var(--text-secondary)] font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[9px] border border-blue-500/10">
                                      {displayAssignee(task).charAt(0)}
                                    </div>
                                    <span className="truncate max-w-[80px]">{displayAssignee(task)}</span>
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
                      onClick={() => void handleCreateProjectFromTab()}
                      disabled={projectActionLoading}
                      className="px-4 py-2 text-xs font-semibold bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-90 rounded-xl shadow-premium flex items-center gap-2 cursor-pointer transition-opacity disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> {projectActionLoading ? "Saving..." : "Create AWS Project"}
                    </button>
                  )}
                </div>

                {dataLoading ? (
                  <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                    Loading projects from DynamoDB...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center text-xs text-[var(--text-secondary)]">
                    No projects returned by the Projects API yet.
                  </div>
                ) : (
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
                        {isUserLeader ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={projectActionLoading}
                              onClick={() => void handleEditProjectFromTab(proj)}
                              className="text-blue-500 hover:underline disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={projectActionLoading}
                              onClick={() => void handleDeleteProjectFromTab(proj)}
                              className="text-rose-500 hover:underline disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">Read-only</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
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
                  <p className="text-xs text-[var(--text-secondary)]">
                    {isUserLeader
                      ? "Company-wide activity from mini-jira-ActivityLog"
                      : "Recent activity for your team"}
                  </p>
                </div>

                {activities.length === 0 && (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-8">
                    No audit entries yet. Change a task status or post a comment.
                  </p>
                )}

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
                          <td className="p-4 font-semibold">{act.taskTitle || act.taskId}</td>
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
              <div className="flex items-center gap-2 shrink-0">
                {isUserLeader && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteTask()}
                    disabled={isDeletingTask}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {isDeletingTask ? "Deleting…" : "Delete"}
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold bg-[var(--bg-primary)] p-1.5 px-3 rounded-lg border border-[var(--border-color)]"
                >
                  Close
                </button>
              </div>
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
                {taskDisplayImageUrl(selectedTask) && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)]">S3 Bucket Attachment</h4>
                    <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-primary)] p-2">
                      <img src={taskDisplayImageUrl(selectedTask)} alt="S3 attachment" className="w-full h-auto rounded-xl object-contain max-h-[220px]" />
                    </div>
                  </div>
                )}

                {/* Task activity timeline */}
                {taskHistory.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-[var(--border-color)] pt-4">
                    <h4 className="text-xs font-bold text-[var(--text-secondary)]">Task History</h4>
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {taskHistory.map((act) => (
                        <div key={act.logId} className="text-[10px] text-[var(--text-secondary)] border-l-2 border-[var(--primary)]/30 pl-2">
                          <span className="font-semibold text-[var(--text-primary)]">{act.actionType}</span>
                          {" — "}{act.message}
                          <span className="block text-[var(--text-tertiary)] mt-0.5">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
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
                    {commentsLoading ? (
                      <p className="text-xs text-[var(--text-tertiary)] italic py-2">Loading comments…</p>
                    ) : comments.filter(c => c.taskId === selectedTask.taskId).length === 0 ? (
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
                      {displayAssignee(selectedTask).charAt(0)}
                    </div>
                    <span className="font-bold">{displayAssignee(selectedTask)}</span>
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
                    onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
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
                    onChange={(e) => setNewTeam(e.target.value)}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs"
                  >
                    {teams.map((t) => (
                      <option key={t.teamId} value={t.teamId}>
                        {t.name || t.teamId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">Individual Assignee</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    disabled={assigneesLoading}
                    className="p-2 w-full rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs disabled:opacity-60"
                  >
                    {assigneesLoading ? (
                      <option value="">Loading team members…</option>
                    ) : createTaskAssigneeOptions.length === 0 ? (
                      <option value="">
                        No employees on this team — assign users in DynamoDB (teamId = this team)
                      </option>
                    ) : (
                      createTaskAssigneeOptions.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <TaskImageUpload
                disabled={isCreatingTask}
                onUploaded={(key, preview) => {
                  setNewImageKey(key);
                  setNewImagePreview(preview);
                }}
                onClear={() => {
                  setNewImageKey(undefined);
                  setNewImagePreview(undefined);
                }}
                initialPreviewUrl={newImagePreview}
                initialImageKey={newImageKey}
              />

              <button
                type="submit"
                disabled={
                  isCreatingTask ||
                  assigneesLoading ||
                  !newTitle.trim() ||
                  !newDesc.trim() ||
                  !newTeam ||
                  !newAssigneeId ||
                  createTaskAssigneeOptions.length === 0
                }
                className="mt-2 py-3 bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 font-bold text-xs rounded-xl shadow-premium cursor-pointer transition-opacity disabled:opacity-50"
              >
                {isCreatingTask ? "Creating…" : "Deploy Task Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
