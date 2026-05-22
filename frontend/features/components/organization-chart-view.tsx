'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  RefreshCcw,
  Shield,
  Users2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Search,
  User,
  UserMinus,
  Plus,
  Minus,
  Grid,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  UserCog,
  ArrowRightLeft,
  X,
} from 'lucide-react';

import { EmptyState } from './empty-state';
import { LoadingState } from './loading-state';
import { AssignTeamModal } from './assign-team-modal';
import { ChangeRoleModal } from './change-role-modal';
import { DeleteUserDialog } from './delete-user-dialog';
import { ToastStack } from './toast-stack';

import { useAssignTeam, useChangeRole, useDeleteUser, useRbac, useTeams, useUserSession } from '@/features/hooks';
import type { OrgChartData, OrgChartFullData, OrgChartRestrictedData, OrgChartUserNode } from '../types/org-chart.types';
import type { UserRole } from '@/types';

interface ToastItem {
  id: number;
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

function getMemberLabel(member: OrgChartUserNode): string {
  const source = member.fullName ?? member.name ?? member.email;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || source.slice(0, 2).toUpperCase();
}

function roleColorClasses(role: OrgChartUserNode['role']): {
  badge: string;
  border: string;
  glow: string;
  bg: string;
  iconColor: string;
} {
  if (role === 'ADMIN') {
    return {
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
      border: 'border-rose-500/40 hover:border-rose-500/80',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.12)]',
      bg: 'bg-gradient-to-br from-rose-500/5 to-transparent',
      iconColor: 'text-rose-500'
    };
  }

  if (role === 'MANAGER') {
    return {
      badge: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
      border: 'border-blue-500/40 hover:border-blue-500/80',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.12)]',
      bg: 'bg-gradient-to-br from-blue-500/5 to-transparent',
      iconColor: 'text-blue-500'
    };
  }

  return {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/40 hover:border-emerald-500/80',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]',
    bg: 'bg-gradient-to-br from-emerald-500/5 to-transparent',
    iconColor: 'text-emerald-500'
  };
}

function OrganizationBadge({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/75 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] dark:bg-white/8">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function OrganizationMetric({ label, value, helper, icon }: { label: string; value: string | number; helper: string; icon: ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-[26px] border border-[var(--border-color)] bg-white/60 p-5 shadow-premium dark:bg-white/8 backdrop-blur-md"
    >
      <div className="absolute right-4 top-4 opacity-10 dark:opacity-20 text-[var(--text-primary)]">
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{value}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{helper}</p>
    </motion.div>
  );
}

// Sleek interactive node card
function OrganizationPersonCard({
  member,
  onClick,
  isHighlighted = false
}: {
  member: OrgChartUserNode;
  onClick?: () => void;
  isHighlighted?: boolean;
}) {
  const initials = getMemberLabel(member);
  const colors = roleColorClasses(member.role);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      onClick={onClick}
      className={`org-card relative w-[280px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 ${
        isHighlighted
          ? 'border-yellow-400 dark:border-yellow-300 shadow-[0_0_22px_rgba(234,179,8,0.35)] scale-105'
          : `${colors.border} ${colors.glow}`
      } bg-white/80 p-4 shadow-premium backdrop-blur-md transition-all duration-300 dark:bg-slate-900/80`}
    >
      <div className={`absolute inset-0 opacity-40 ${colors.bg}`} />
      
      <div className="relative z-10 flex items-start gap-3">
        {/* Avatar with status indicator */}
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-600 text-sm font-black text-white shadow-md">
            {member.avatar ? (
              <img src={member.avatar} alt={member.fullName ?? member.name ?? member.email} className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {/* Mock active session ping */}
          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
          </span>
        </div>

        {/* User Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1">
            <h4 className="truncate text-sm font-bold text-[var(--text-primary)] leading-snug">
              {member.fullName ?? member.name ?? member.email.split('@')[0]}
            </h4>
            <p className="break-all text-[11px] text-[var(--text-secondary)] opacity-85 leading-none">
              {member.email}
            </p>
          </div>
          
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-color)]/60 pt-2.5">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {member.teamId ?? 'Core Team'}
            </span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${colors.badge}`}>
              {member.role}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Tree view branch with connection lines
function TreeBranch({
  children,
  card,
  isExpanded,
  onToggle,
  layoutMode
}: {
  children?: ReactNode;
  card: ReactNode;
  isExpanded: boolean;
  onToggle?: () => void;
  layoutMode: 'vertical' | 'horizontal';
}) {
  const hasChildren = children && typeof children === 'object' && (!Array.isArray(children) || children.length > 0);

  if (layoutMode === 'horizontal') {
    return (
      <div className="flex items-center relative py-3 select-none">
        {/* Node Card */}
        <div className="relative z-10">
          {card}
        </div>

        {/* Connector and Children Wrapper */}
        {hasChildren && (
          <div className="flex items-center relative pl-8">
            {/* Horizontal line extending from parent card to children stack */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-px bg-slate-300/80 dark:bg-slate-700/80" />

            {/* Plus/Minus toggle centered on connection line */}
            {onToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="absolute left-4 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 text-[10px] font-bold text-[var(--text-primary)] hover:scale-110 shadow-sm transition-transform cursor-pointer"
              >
                {isExpanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>
            )}

            {/* Stack of Child Branches */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col gap-4 relative py-1"
                >
                  {/* Sibling vertical bracket line overlay */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300/80 dark:bg-slate-700/80 first:top-1/2 last:bottom-1/2" />
                  
                  {/* Map over kids and wrap them with horizontal and vertical connector styling */}
                  {Array.isArray(children) ? (
                    children.map((child, idx) => (
                      <div
                        key={idx}
                        className="relative pl-8 before:absolute before:left-0 before:w-px before:bg-slate-300/80 dark:before:bg-slate-700/80 before:h-1/2 before:bottom-1/2 first:before:hidden after:absolute after:left-0 after:w-px after:bg-slate-300/80 dark:after:bg-slate-700/80 after:h-1/2 after:top-1/2 last:after:hidden"
                      >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-8 bg-slate-300/80 dark:bg-slate-700/80" />
                        {child}
                      </div>
                    ))
                  ) : (
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px w-8 bg-slate-300/80 dark:bg-slate-700/80" />
                      {children}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  // Vertical layout (Root or nodes branching downwards)
  return (
    <div className="flex flex-col items-center relative select-none">
      {/* Node Card */}
      <div className="relative z-10">
        {card}
      </div>

      {/* Children container with connecting bracket */}
      {hasChildren && (
        <div className="flex flex-col items-center w-full relative">
          {/* Vertical line extending down from parent card */}
          <div className="w-px h-8 bg-slate-300/80 dark:bg-slate-700/80 relative">
            {/* Toggle button centered on line */}
            {onToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 text-[10px] font-bold text-[var(--text-primary)] hover:scale-110 shadow-sm transition-transform cursor-pointer"
              >
                {isExpanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Children row container */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22 }}
                className="flex gap-8 justify-center relative pt-8"
              >
                {/* Sibling horizontal line overlay */}
                <div className="absolute top-0 left-0 right-0 h-px bg-slate-300/80 dark:bg-slate-700/80 first:left-1/2 last:right-1/2" />
                
                {Array.isArray(children) ? (
                  children.map((child, idx) => (
                    <div
                      key={idx}
                      className="relative flex flex-col items-center before:absolute before:top-0 before:h-px before:bg-slate-300/80 dark:before:bg-slate-700/80 before:w-1/2 before:left-0 first:before:hidden after:absolute after:top-0 after:h-px after:bg-slate-300/80 dark:after:bg-slate-700/80 after:w-1/2 after:right-0 last:after:hidden"
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300/80 dark:bg-slate-700/80" />
                      {child}
                    </div>
                  ))
                ) : (
                  <div className="relative flex flex-col items-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-300/80 dark:bg-slate-700/80" />
                    {children}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function OrganizationChartView({
  data,
  isLoading,
  error,
  onRetry,
  message
}: {
  data: OrgChartData | null;
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  message?: string | null;
}) {
  // Main view state
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal' | 'grid'>('horizontal');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  
  // Collapse/Expand state for structural nodes
  const [collapsedTeamIds, setCollapsedTeamIds] = useState<string[]>([]);
  const [isLeadershipExpanded, setIsLeadershipExpanded] = useState(true);
  const [isAdminsExpanded, setIsAdminsExpanded] = useState(true);
  const [isManagersExpanded, setIsManagersExpanded] = useState(true);
  const [isTeamsExpanded, setIsTeamsExpanded] = useState(true);
  const [isUnassignedExpanded, setIsUnassignedExpanded] = useState(true);

  // User details sidebar & action states
  const [selectedUser, setSelectedUser] = useState<OrgChartUserNode | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const toastCounterRef = useRef(0);

  // Initialize hooks for admin functions
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);
  const isAdmin = rbac.isAdmin;
  
  const teams = useTeams();
  const teamAssignment = useAssignTeam();
  const roleChange = useChangeRole();
  const userDelete = useDeleteUser();

  const pushToast = useCallback((tone: 'success' | 'error' | 'info', title: string, message: string) => {
    toastCounterRef.current += 1;
    const id = toastCounterRef.current;
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  // Zooming constraints
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!viewportRef.current) return;
    if (!document.fullscreenElement) {
      viewportRef.current.requestFullscreen().catch((err) => {
        pushToast('error', 'Fullscreen Error', err.message || 'Unable to enter fullscreen mode.');
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Canvas Dragging Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (layoutMode === 'grid') return;
    const target = e.target as HTMLElement;
    if (target.closest('.org-card') || target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || layoutMode === 'grid') return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (layoutMode === 'grid') return;
    const target = e.target as HTMLElement;
    if (target.closest('.org-card') || target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }
    const zoomFactor = 0.05;
    const nextZoom = e.deltaY < 0 ? Math.min(zoom + zoomFactor, 1.5) : Math.max(zoom - zoomFactor, 0.5);
    setZoom(parseFloat(nextZoom.toFixed(2)));
  };

  // Keyboard shortcut: pressing "/" focuses search bar
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle live search matching and expansion of paths
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim() !== '' && data && data.scope === 'ALL') {
      const full = data as OrgChartFullData;
      const query = val.toLowerCase();
      const matchingTeamIds: string[] = [];
      
      full.teams.forEach(t => {
        const match = t.members.some(m => 
          (m.fullName ?? m.name ?? m.email).toLowerCase().includes(query) || 
          m.email.toLowerCase().includes(query)
        );
        if (match) {
          matchingTeamIds.push(t.teamId);
        }
      });

      // Expand matched folders
      setCollapsedTeamIds(prev => prev.filter(id => !matchingTeamIds.includes(id)));
      setIsAdminsExpanded(true);
      setIsManagersExpanded(true);
      setIsTeamsExpanded(true);
      setIsUnassignedExpanded(true);
    }
  };

  // Admin mutation triggers
  const handleAssignTeam = () => {
    teamAssignment.reset();
    setIsAssignModalOpen(true);
  };

  const handleOpenChangeRole = () => {
    roleChange.reset();
    setIsRoleModalOpen(true);
  };

  const handleOpenDeleteDialog = () => {
    userDelete.reset();
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAssignment = async (teamId: string) => {
    if (!selectedUser) return;
    try {
      const result = await teamAssignment.assignTeam(selectedUser.userId, teamId);
      pushToast('success', 'Team Assigned', result.message || 'User team was successfully updated.');
      setIsAssignModalOpen(false);
      
      // Update local card values
      setSelectedUser(prev => prev ? { ...prev, teamId } : null);
      onRetry?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign team.';
      pushToast('error', 'Assignment Failed', message);
    }
  };

  const handleSubmitRoleChange = async (role: UserRole) => {
    if (!selectedUser) return;
    try {
      const result = await roleChange.changeRole(selectedUser.userId, role);
      pushToast('success', 'Role Updated', result.message || 'User role has been successfully changed.');
      setIsRoleModalOpen(false);
      
      // Update local card values
      setSelectedUser(prev => prev ? { ...prev, role } : null);
      onRetry?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role.';
      pushToast('error', 'Update Failed', message);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedUser) return;
    try {
      const result = await userDelete.deleteUser(selectedUser.userId);
      pushToast('success', 'User Deleted', result.message || 'Employee was permanently deleted.');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      onRetry?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user.';
      pushToast('error', 'Deletion Failed', message);
    }
  };

  // Check if a member matches filters
  const matchesSearchAndFilter = useCallback((member: OrgChartUserNode) => {
    const nameStr = (member.fullName ?? member.name ?? member.email).toLowerCase();
    const matchesSearch = nameStr.includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? member.role === roleFilter : true;
    return matchesSearch && matchesRole;
  }, [searchQuery, roleFilter]);

  // Loading indicator
  if (isLoading) {
    return (
      <LoadingState
        fullHeight
        title="Accessing AWS Org Directory"
        description="Decrypting security policies and laying out high-availability structure..."
        icon={<Users2 className="h-6 w-6 animate-pulse text-indigo-500" />}
      />
    );
  }

  // Error screen
  if (error) {
    return (
      <EmptyState
        title="Failed to fetch AWS directory"
        description={error}
        icon={<AlertCircle className="h-8 w-8 text-rose-500" />}
        primaryAction={onRetry ? { label: 'Re-Establish Connection', onClick: onRetry } : undefined}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Empty AWS Directory"
        description="Cognito did not return any records for the current corporate scope."
        icon={<Shield className="h-8 w-8 text-indigo-500" />}
        primaryAction={onRetry ? { label: 'Connect to Cognito', onClick: onRetry } : undefined}
      />
    );
  }

  // TEAM RESTRICTED VIEW
  if (data.scope === 'TEAM') {
    const restricted = data as OrgChartRestrictedData;
    const teamMembers = restricted.members || [];
    const filteredMembers = teamMembers.filter(matchesSearchAndFilter);

    return (
      <div className="space-y-6">
        <ToastStack items={toasts} />
        
        {/* Context panel */}
        <div className="rounded-[30px] border border-[var(--border-color)] bg-white/55 p-5 shadow-premium sm:p-6 dark:bg-white/8 backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <OrganizationBadge label="Restricted View" icon={<Shield className="h-3.5 w-3.5" />} />
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Your Team Workspace</h2>
              <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                You are viewing members of your assigned team branch. High-level leadership nodes (Admins/Managers) are locked based on corporate security hierarchy bounds.
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white/70 px-4.5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/95 hover:shadow-sm dark:bg-white/10"
            >
              <RefreshCcw className="h-4 w-4" />
              Re-Sync
            </button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-3xl border border-[var(--border-color)]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search team members... (Press '/' to focus)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[var(--border-color)] bg-white/70 text-sm outline-none focus:border-indigo-400 dark:bg-slate-900/70"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content list */}
        {restricted.team ? (
          <div className="rounded-[30px] border border-[var(--border-color)] bg-white/45 p-6 dark:bg-slate-900/45">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <h3 className="text-xl font-black text-[var(--text-primary)]">{restricted.team.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{restricted.team.description || 'Corporate department branch.'}</p>
              </div>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {filteredMembers.length} Employees
              </span>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <OrganizationPersonCard
                    key={member.userId}
                    member={member}
                    onClick={() => setSelectedUser(member)}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-sm text-[var(--text-secondary)]">
                  No team members matched your filter.
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Unassigned Account"
            description="Your account is not attached to any team branch in Cognito. Please contact an Administrator."
            icon={<Shield className="h-8 w-8 text-rose-500" />}
          />
        )}
      </div>
    );
  }

  // ADMIN / MANAGER FULL VIEW
  const full = data as OrgChartFullData;

  // Filtered members count
  const matchingAdmins = full.admins.filter(matchesSearchAndFilter);
  const matchingManagers = full.managers.filter(matchesSearchAndFilter);
  const matchingUnassigned = full.unassignedEmployees.filter(matchesSearchAndFilter);
  const matchingTeams = full.teams.map(team => ({
    ...team,
    members: team.members.filter(matchesSearchAndFilter)
  }));

  const totalFiltered =
    matchingAdmins.length +
    matchingManagers.length +
    matchingUnassigned.length +
    matchingTeams.reduce((acc, t) => acc + t.members.length, 0);

  // Toggle helpers
  const toggleTeamCollapse = (teamId: string) => {
    setCollapsedTeamIds(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    );
  };

  const expandAll = () => {
    setCollapsedTeamIds([]);
    setIsLeadershipExpanded(true);
    setIsAdminsExpanded(true);
    setIsManagersExpanded(true);
    setIsTeamsExpanded(true);
    setIsUnassignedExpanded(true);
  };

  const collapseAll = () => {
    setCollapsedTeamIds(full.teams.map(t => t.teamId));
    setIsLeadershipExpanded(false);
    setIsAdminsExpanded(false);
    setIsManagersExpanded(false);
    setIsTeamsExpanded(false);
    setIsUnassignedExpanded(false);
  };

  return (
    <div className="space-y-6">
      <ToastStack items={toasts} />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OrganizationMetric
          label="System Admins"
          value={full.summary.totalAdmins}
          helper="Cognito Root administrators overseeing operations."
          icon={<Shield className="h-10 w-10 text-rose-500" />}
        />
        <OrganizationMetric
          label="Project Managers"
          value={full.summary.totalManagers}
          helper="Operational directors assigning and reviews projects."
          icon={<Users2 className="h-10 w-10 text-blue-500" />}
        />
        <OrganizationMetric
          label="Active Teams"
          value={full.summary.totalTeams}
          helper="Siloed divisions with strict data-isolation boundaries."
          icon={<Building2 className="h-10 w-10 text-violet-500" />}
        />
        <OrganizationMetric
          label="Employees"
          value={full.summary.totalEmployees}
          helper="FTE resources fulfilling workflow operations."
          icon={<UserCog className="h-10 w-10 text-emerald-500" />}
        />
      </div>

      {/* Control bar */}
      <div className="flex flex-col gap-4 p-4 rounded-3xl border border-[var(--border-color)] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-premium">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search inputs */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search organization... (Press '/' to focus)"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--border-color)] bg-white/80 text-xs outline-none focus:border-indigo-400 dark:bg-slate-950/80"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            
            <select
              className="rounded-xl border border-[var(--border-color)] bg-white/80 px-3 py-2 text-xs outline-none focus:border-indigo-400 dark:bg-slate-950/80 text-[var(--text-secondary)] font-medium"
              value={roleFilter ?? ''}
              onChange={(e) => setRoleFilter(e.target.value || null)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="MANAGER">Managers Only</option>
              <option value="EMPLOYEE">Employees Only</option>
            </select>

            {searchQuery && (
              <span className="text-xs font-semibold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                {totalFiltered} matches
              </span>
            )}
          </div>

          {/* Canvas modifiers and layout selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-white/80 p-0.5 dark:bg-slate-950/80">
              <button
                type="button"
                onClick={() => setLayoutMode('horizontal')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  layoutMode === 'horizontal'
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="Horizontal Mindmap Layout"
              >
                <Grid className="h-4 w-4 rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('vertical')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  layoutMode === 'vertical'
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="Vertical Hierarchy Layout"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  layoutMode === 'grid'
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800'
                }`}
                title="Dashboard Grid View"
              >
                <Activity className="h-4 w-4" />
              </button>
            </div>

            {/* Tree zoom features */}
            {layoutMode !== 'grid' && (
              <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-white/80 p-0.5 dark:bg-slate-950/80">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-black px-1.5 select-none w-10 text-center text-[var(--text-primary)]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-1.5 rounded-lg text-xs font-bold text-indigo-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 px-2"
                  title="Recenter and Fit View"
                >
                  100%
                </button>
              </div>
            )}

            {/* Fold modifiers */}
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-white/80 p-0.5 dark:bg-slate-950/80">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:bg-slate-200/50 dark:hover:bg-slate-800"
              >
                Collapse All
              </button>
            </div>

            {/* Fullscreen view */}
            {layoutMode !== 'grid' && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-white/80 hover:bg-white text-[var(--text-primary)] shadow-sm dark:bg-slate-950/80"
                title="Fullscreen Presentation Mode"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Org message indicator if present */}
      {message && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-white/45 px-5 py-3 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur-md dark:bg-white/5">
          {message}
        </div>
      )}

      {/* RENDER GRID MODE */}
      {layoutMode === 'grid' && (
        <div className="space-y-6">
          {/* Admins & Managers section */}
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[30px] border border-[var(--border-color)] bg-white/55 p-6 shadow-premium dark:bg-white/8 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
                <div className="space-y-1">
                  <OrganizationBadge label="System Admins" icon={<Shield className="h-3.5 w-3.5" />} />
                  <h3 className="text-lg font-black text-[var(--text-primary)]">Administrative Core</h3>
                </div>
                <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {matchingAdmins.length} Users
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchingAdmins.length > 0 ? (
                  matchingAdmins.map((member) => (
                    <OrganizationPersonCard
                      key={member.userId}
                      member={member}
                      onClick={() => setSelectedUser(member)}
                      isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-[var(--text-secondary)]">No Admin records found matching constraints.</div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--border-color)] bg-white/55 p-6 shadow-premium dark:bg-white/8 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
                <div className="space-y-1">
                  <OrganizationBadge label="Managers" icon={<Users2 className="h-3.5 w-3.5" />} />
                  <h3 className="text-lg font-black text-[var(--text-primary)]">Operations Managers</h3>
                </div>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  {matchingManagers.length} Users
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {matchingManagers.length > 0 ? (
                  matchingManagers.map((member) => (
                    <OrganizationPersonCard
                      key={member.userId}
                      member={member}
                      onClick={() => setSelectedUser(member)}
                      isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-6 text-center text-xs text-[var(--text-secondary)]">No Manager records found matching constraints.</div>
                )}
              </div>
            </div>
          </section>

          {/* Teams Grid */}
          <section className="space-y-4">
            <h3 className="text-lg font-black text-[var(--text-primary)] pl-2">Corporate Team Subnets</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {matchingTeams.map((team) => (
                <div key={team.teamId} className="rounded-[30px] border border-[var(--border-color)] bg-white/55 p-6 shadow-premium dark:bg-white/8 backdrop-blur-md">
                  <div className="mb-4 flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
                    <div>
                      <h4 className="text-md font-bold text-[var(--text-primary)]">{team.name}</h4>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{team.description || 'AWS Isolated Team Network.'}</p>
                    </div>
                    <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                      {team.members.length} Members
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {team.members.length > 0 ? (
                      team.members.map((member) => (
                        <OrganizationPersonCard
                          key={member.userId}
                          member={member}
                          onClick={() => setSelectedUser(member)}
                          isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                        />
                      ))
                    ) : (
                      <div className="col-span-full py-6 text-center text-xs text-[var(--text-secondary)]">No assigned team members matched criteria.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Unassigned row */}
          {matchingUnassigned.length > 0 && (
            <section className="rounded-[30px] border border-[var(--border-color)] bg-white/55 p-6 shadow-premium dark:bg-white/8 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border-color)]/60 pb-3">
                <div className="space-y-1">
                  <OrganizationBadge label="Floating Core" icon={<UserMinus className="h-3.5 w-3.5" />} />
                  <h3 className="text-lg font-black text-[var(--text-primary)]">Unassigned Employees</h3>
                </div>
                <span className="rounded-full bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  {matchingUnassigned.length} Users
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {matchingUnassigned.map((member) => (
                  <OrganizationPersonCard
                    key={member.userId}
                    member={member}
                    onClick={() => setSelectedUser(member)}
                    isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* RENDER TREE CANVAS MODE */}
      {layoutMode !== 'grid' && (
        <div
          ref={viewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`relative h-[680px] w-full overflow-hidden rounded-[30px] border border-[var(--border-color)] bg-gradient-to-br from-slate-50 via-sky-50/20 to-blue-50/30 dark:from-slate-950 dark:via-slate-900/60 dark:to-indigo-950/20 shadow-premium transition-all ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            backgroundImage: 'radial-gradient(var(--text-tertiary) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
          }}
        >
          {/* Fullscreen Background Decorator */}
          {isFullscreen && (
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-100/10 dark:from-slate-950 dark:to-slate-900" />
          )}

          {/* Floating Instructions */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none rounded-xl bg-white/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] shadow-sm dark:bg-slate-900/70 border border-[var(--border-color)]">
            🖱️ Drag canvas to pan • 📜 Scroll wheel to zoom
          </div>

          {/* Panning & Zooming Scaled Workspace Container */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            {/* BUILD HIERARCHICAL TREE DESIGN */}
            <TreeBranch
              layoutMode={layoutMode}
              isExpanded={isLeadershipExpanded}
              onToggle={() => setIsLeadershipExpanded(prev => !prev)}
              card={
                <div className="org-card flex flex-col items-center justify-center p-5 w-[300px] rounded-3xl border-2 border-indigo-500/40 bg-white/85 dark:bg-slate-900/90 shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:border-indigo-500 transition-all select-none">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md mb-2">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-md font-black tracking-tight text-[var(--text-primary)]">AWS Enterprise Hub</h3>
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 mt-1">Cognito Directory Pool</p>
                  
                  <div className="mt-3 flex items-center justify-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <Users2 className="h-3 w-3" />
                    <span>{full.summary.totalAdmins + full.summary.totalManagers + full.summary.totalEmployees} Assigned Accounts</span>
                  </div>
                </div>
              }
            >
              {/* ADMIN CORE HUB */}
              {full.admins.length > 0 && (
                <TreeBranch
                  layoutMode={layoutMode}
                  isExpanded={isAdminsExpanded}
                  onToggle={() => setIsAdminsExpanded(prev => !prev)}
                  card={
                    <div className="org-card w-[280px] p-4 rounded-2xl border-2 border-rose-500/40 bg-white/80 dark:bg-slate-900/80 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:border-rose-500 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-sm">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-tertiary)]">Security Group</h4>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Administrators</h3>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-semibold text-[var(--text-secondary)] bg-rose-500/5 border border-rose-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between">
                        <span>Corporate System Control</span>
                        <span className="font-bold text-rose-500">{matchingAdmins.length} Admins</span>
                      </div>
                    </div>
                  }
                >
                  {isAdminsExpanded && matchingAdmins.map((admin) => (
                    <OrganizationPersonCard
                      key={admin.userId}
                      member={admin}
                      onClick={() => setSelectedUser(admin)}
                      isHighlighted={searchQuery !== '' && (admin.fullName ?? admin.name ?? admin.email).toLowerCase().includes(searchQuery.toLowerCase())}
                    />
                  ))}
                </TreeBranch>
              )}

              {/* MANAGER CORE HUB */}
              {full.managers.length > 0 && (
                <TreeBranch
                  layoutMode={layoutMode}
                  isExpanded={isManagersExpanded}
                  onToggle={() => setIsManagersExpanded(prev => !prev)}
                  card={
                    <div className="org-card w-[280px] p-4 rounded-2xl border-2 border-blue-500/40 bg-white/80 dark:bg-slate-900/80 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:border-blue-500 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                          <Users2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-tertiary)]">Operations Layer</h4>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Managers Hub</h3>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-semibold text-[var(--text-secondary)] bg-blue-500/5 border border-blue-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between">
                        <span>Project Assignment Bounds</span>
                        <span className="font-bold text-blue-500">{matchingManagers.length} Managers</span>
                      </div>
                    </div>
                  }
                >
                  {isManagersExpanded && matchingManagers.map((manager) => (
                    <OrganizationPersonCard
                      key={manager.userId}
                      member={manager}
                      onClick={() => setSelectedUser(manager)}
                      isHighlighted={searchQuery !== '' && (manager.fullName ?? manager.name ?? manager.email).toLowerCase().includes(searchQuery.toLowerCase())}
                    />
                  ))}
                </TreeBranch>
              )}

              {/* DEPARTMENTS / TEAMS */}
              {full.teams.length > 0 && (
                <TreeBranch
                  layoutMode={layoutMode}
                  isExpanded={isTeamsExpanded}
                  onToggle={() => setIsTeamsExpanded(prev => !prev)}
                  card={
                    <div className="org-card w-[280px] p-4 rounded-2xl border-2 border-violet-500/40 bg-white/80 dark:bg-slate-900/80 shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:border-violet-500 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-tertiary)]">Siloed Workspaces</h4>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Corporate Teams</h3>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-semibold text-[var(--text-secondary)] bg-violet-500/5 border border-violet-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between">
                        <span>Strict GSI Isolation Rules</span>
                        <span className="font-bold text-violet-500">{matchingTeams.length} Divisions</span>
                      </div>
                    </div>
                  }
                >
                  {isTeamsExpanded && matchingTeams.map((team) => {
                    const isTeamCollapsed = collapsedTeamIds.includes(team.teamId);
                    return (
                      <TreeBranch
                        key={team.teamId}
                        layoutMode={layoutMode}
                        isExpanded={!isTeamCollapsed}
                        onToggle={() => toggleTeamCollapse(team.teamId)}
                        card={
                          <div className="org-card w-[270px] p-4 rounded-xl border border-violet-500/30 bg-white/80 dark:bg-slate-900/85 hover:border-violet-500/70 transition-all shadow-premium">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-primary)]">{team.name}</h4>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-1">
                                  {team.description || 'AWS Isolated Subnet Division.'}
                                </p>
                              </div>
                              <span className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                                {team.members.length} Users
                              </span>
                            </div>
                          </div>
                        }
                      >
                        {!isTeamCollapsed && team.members.map((member) => (
                          <OrganizationPersonCard
                            key={member.userId}
                            member={member}
                            onClick={() => setSelectedUser(member)}
                            isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                          />
                        ))}
                      </TreeBranch>
                    );
                  })}
                </TreeBranch>
              )}

              {/* UNASSIGNED CORE */}
              {full.unassignedEmployees.length > 0 && (
                <TreeBranch
                  layoutMode={layoutMode}
                  isExpanded={isUnassignedExpanded}
                  onToggle={() => setIsUnassignedExpanded(prev => !prev)}
                  card={
                    <div className="org-card w-[280px] p-4 rounded-2xl border-2 border-slate-500/40 bg-white/80 dark:bg-slate-900/80 shadow-[0_0_15px_rgba(100,116,139,0.1)] hover:border-slate-500 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white shadow-sm">
                          <UserMinus className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-tertiary)]">Floating Core</h4>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Unassigned Members</h3>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] font-semibold text-[var(--text-secondary)] bg-slate-500/5 border border-slate-500/10 rounded-lg px-2.5 py-1 flex items-center justify-between">
                        <span>No Team Bindings Set</span>
                        <span className="font-bold text-slate-500">{matchingUnassigned.length} Users</span>
                      </div>
                    </div>
                  }
                >
                  {isUnassignedExpanded && matchingUnassigned.map((member) => (
                    <OrganizationPersonCard
                      key={member.userId}
                      member={member}
                      onClick={() => setSelectedUser(member)}
                      isHighlighted={searchQuery !== '' && (member.fullName ?? member.name ?? member.email).toLowerCase().includes(searchQuery.toLowerCase())}
                    />
                  ))}
                </TreeBranch>
              )}
            </TreeBranch>
          </div>
        </div>
      )}

      {/* DRAWER & DIALOGS */}
      {/* Drawer Overlay Dim Background */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 z-30 bg-black backdrop-blur-[2px]"
            />
            
            {/* Slide-out detail drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md border-l border-[var(--border-color)] bg-white/90 p-6 shadow-[0_0_50px_rgba(0,0,0,0.15)] dark:bg-slate-900/90 backdrop-blur-2xl overflow-y-auto flex flex-col justify-between select-none"
            >
              <div className="space-y-6">
                {/* Header controls */}
                <div className="flex items-center justify-between border-b border-[var(--border-color)]/60 pb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <User className="h-4.5 w-4.5 text-indigo-500" />
                    Employee Credentials
                  </span>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 text-[var(--text-secondary)] transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Profile overview Card */}
                <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-[var(--border-color)]/50 relative overflow-hidden">
                  {/* Subtle blur background spot */}
                  <div className="absolute -top-12 -left-12 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
                  <div className="absolute -bottom-12 -right-12 h-24 w-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
                  
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[28px] border-4 border-white dark:border-slate-800 bg-gradient-to-br from-indigo-500 via-sky-400 to-blue-600 text-2xl font-black text-white shadow-md mb-3 relative">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.fullName ?? selectedUser.email} className="h-full w-full object-cover" />
                    ) : (
                      <span>{getMemberLabel(selectedUser)}</span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-[var(--text-primary)]">
                    {selectedUser.fullName ?? selectedUser.name ?? selectedUser.email.split('@')[0]}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-90 break-all px-4">
                    {selectedUser.email}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <span className={`inline-flex rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${roleColorClasses(selectedUser.role).badge}`}>
                      Role: {selectedUser.role}
                    </span>
                    <span className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                      Team: {selectedUser.teamId ?? 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Scope capabilities list */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--text-tertiary)] pl-1">Authorized IAM Privileges</h4>
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-white/40 dark:bg-slate-900/40 space-y-2.5 text-xs text-[var(--text-secondary)]">
                    {selectedUser.role === 'ADMIN' ? (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Complete oversight of user credentials, Cognito records, and team assignments.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Ability to modify system tables and partition access roles.</span>
                        </div>
                      </>
                    ) : selectedUser.role === 'MANAGER' ? (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Create projects and generate work tickets for any team subnet.</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Cross-team analytics dashboard visibility.</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Access to tasks within assigned team bounds (Filtered via DynamoDB GSI).</span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                          <span>Ability to shift task statuses on own assigned tasks.</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mock Work Stats to feel extremely presentation ready */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[var(--text-tertiary)] pl-1">Corporate Metrics</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-white/40 dark:bg-slate-900/40 text-center">
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase leading-none">Open Tasks</p>
                      <p className="text-lg font-black text-[var(--text-primary)] mt-2">
                        {selectedUser.role === 'ADMIN' ? 'N/A' : selectedUser.role === 'MANAGER' ? '45' : '4'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-white/40 dark:bg-slate-900/40 text-center">
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase leading-none">Completed</p>
                      <p className="text-lg font-black text-emerald-500 mt-2">
                        {selectedUser.role === 'ADMIN' ? 'N/A' : selectedUser.role === 'MANAGER' ? '128' : '15'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-white/40 dark:bg-slate-900/40 text-center">
                      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase leading-none">Activity</p>
                      <p className="text-xs font-black text-indigo-500 mt-3.5 uppercase leading-none">High</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative user modification panel (rendered if logged user is Admin) */}
              <div className="mt-8 pt-4 border-t border-[var(--border-color)]/60 space-y-3">
                {isAdmin ? (
                  <>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-500 pl-1 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Administrative Control Override
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAssignTeam}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-white/80 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-white hover:shadow-sm dark:bg-slate-850 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-500" />
                        Assign Team
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenChangeRole}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-white/80 py-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-white hover:shadow-sm dark:bg-slate-850 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        <UserCog className="h-3.5 w-3.5 text-blue-500" />
                        Change Role
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDeleteDialog}
                        className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Account
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-slate-100 dark:bg-slate-950/60 p-3 text-[10px] text-center text-[var(--text-tertiary)] font-semibold border border-[var(--border-color)]/40">
                    ℹ️ You are not authorized to modify Cognito credentials.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin controls modals */}
      {selectedUser && (
        <>
          <AssignTeamModal
            open={isAssignModalOpen}
            user={{
              userId: selectedUser.userId,
              email: selectedUser.email,
              role: selectedUser.role,
              teamId: selectedUser.teamId ?? undefined,
            }}
            teams={teams.teams}
            teamsLoading={teams.isLoading}
            teamsError={teams.error}
            isSaving={teamAssignment.isSaving}
            successMessage={teamAssignment.result?.message ?? null}
            errorMessage={teamAssignment.error}
            onClose={() => {
              setIsAssignModalOpen(false);
              teamAssignment.reset();
            }}
            onSubmit={handleSubmitAssignment}
            onRefreshTeams={teams.refresh}
          />

          <ChangeRoleModal
            open={isRoleModalOpen}
            user={{
              userId: selectedUser.userId,
              email: selectedUser.email,
              role: selectedUser.role,
              teamId: selectedUser.teamId ?? undefined,
            }}
            isSaving={roleChange.isSaving}
            successMessage={roleChange.result?.message ?? null}
            errorMessage={roleChange.error}
            onClose={() => {
              setIsRoleModalOpen(false);
              roleChange.reset();
            }}
            onSubmit={handleSubmitRoleChange}
          />

          <DeleteUserDialog
            open={isDeleteDialogOpen}
            user={{
              userId: selectedUser.userId,
              email: selectedUser.email,
              role: selectedUser.role,
              teamId: selectedUser.teamId ?? undefined,
            }}
            currentUserId={session?.userId}
            isDeleting={userDelete.isDeleting}
            errorMessage={userDelete.error}
            onClose={() => {
              setIsDeleteDialogOpen(false);
              userDelete.reset();
            }}
            onConfirm={handleSubmitDelete}
          />
        </>
      )}
    </div>
  );
}
