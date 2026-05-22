'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { Shield, ArrowRightLeft, RefreshCcw, Users2, UserCog, BriefcaseBusiness } from 'lucide-react';

import { AssignTeamModal, ChangeRoleModal, DeleteUserDialog, ProtectedLayout, ToastStack, UsersTable } from '@/features/components';
import { useAssignTeam, useChangeRole, useDeleteUser, useRbac, useTeams, useUserSession, useUsers } from '@/features/hooks';

import type { UserRole } from '@/types';

import type { UserSummary } from '@/features/types/user.types';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
}

export default function UsersManagementPage() {
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);
  const { items, isLoading, error, search, setSearch, roleFilter, setRoleFilter, refresh } = useUsers();
  const teams = useTeams();
  const teamAssignment = useAssignTeam();
  const roleChange = useChangeRole();
  const userDelete = useDeleteUser();

  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounterRef = useRef(0);

  const isAdmin = useMemo(() => rbac.isAdmin, [rbac.isAdmin]);
  const adminCount = useMemo(() => items.filter((item) => item.role === 'ADMIN').length, [items]);
  const managerCount = useMemo(() => items.filter((item) => item.role === 'MANAGER').length, [items]);
  const employeeCount = useMemo(() => items.filter((item) => item.role === 'EMPLOYEE').length, [items]);

  const pushToast = useCallback((tone: ToastTone, title: string, message: string) => {
    toastCounterRef.current += 1;
    const id = toastCounterRef.current;
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const handleAssignTeam = (userId: string) => {
    const user = items.find((item) => item.userId === userId) ?? null;
    teamAssignment.reset();
    setSelectedUser(user);
    setIsAssignModalOpen(true);
  };

  const handleOpenChangeRole = (userId: string) => {
    const user = items.find((item) => item.userId === userId) ?? null;
    roleChange.reset();
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleOpenDeleteDialog = (userId: string) => {
    const user = items.find((item) => item.userId === userId) ?? null;
    userDelete.reset();
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAssignment = async (teamId: string) => {
    if (!selectedUser) {
      return;
    }

    try {
      const result = await teamAssignment.assignTeam(selectedUser.userId, teamId);
      pushToast('success', 'Team assigned', result.message);
      setIsAssignModalOpen(false);
      setSelectedUser(null);
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign team.';
      pushToast('error', 'Assignment failed', message);
    }
  };

  const handleSubmitRoleChange = async (role: UserRole) => {
    if (!selectedUser) {
      return;
    }

    try {
      const result = await roleChange.changeRole(selectedUser.userId, role);
      pushToast('success', 'Role updated', result.message);
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update role.';
      pushToast('error', 'Role update failed', message);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      const result = await userDelete.deleteUser(selectedUser.userId);
      pushToast('success', 'User deleted', result.message);
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user.';
      const toneTitle = message.toLowerCase().includes('forbidden') ? 'Forbidden action' : 'Deletion failed';
      pushToast('error', toneTitle, message);
    }
  };

  return (
    <ProtectedLayout allowedRoles={['ADMIN']}>
      <div className="cloud-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <ToastStack items={toasts} />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            className="cloud-surface glass-panel rounded-[30px] border border-[var(--border-color)] p-5 shadow-premium sm:p-6"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                  <Users2 className="h-3.5 w-3.5" />
                  Users Management
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Admin user controls</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                    Search users, manage roles, and assign teams through a guarded admin workflow.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-[26px] border border-[var(--border-color)] bg-white/55 p-4 dark:bg-white/8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-sky-600 dark:bg-white/10 dark:text-sky-300">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Access</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Admin only</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh users
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Admins</p>
                  <Shield className="h-4 w-4 text-red-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{adminCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Managers</p>
                  <BriefcaseBusiness className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{managerCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Employees</p>
                  <UserCog className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{employeeCount}</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.05 }}
            className="cloud-surface glass-panel rounded-[30px] border border-[var(--border-color)] p-5 shadow-premium sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-[var(--text-primary)]">User directory</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Team assignment uses PUT /users/:userId/team and refreshes the user list on success.</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-tertiary)] focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-white/10"
                  placeholder="Search users"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-white/10"
                  value={roleFilter ?? ''}
                  onChange={(event) => setRoleFilter(event.target.value || null)}
                >
                  <option value="">All roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
            </div>

            {isAdmin ? (
              <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">
                <div className="flex items-start gap-3">
                  <ArrowRightLeft className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Assign Team workflow enabled</p>
                    <p className="mt-1 leading-6">Open the action menu on any user to move them to another team.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <UsersTable
                users={items}
                isLoading={isLoading}
                error={error}
                canManage={isAdmin}
                onAssignTeam={isAdmin ? handleAssignTeam : undefined}
                onChangeRole={isAdmin ? handleOpenChangeRole : undefined}
                onDelete={isAdmin ? handleOpenDeleteDialog : undefined}
              />
            </div>
          </motion.section>
        </div>

        <AssignTeamModal
          open={isAssignModalOpen}
          user={selectedUser}
          teams={teams.teams}
          teamsLoading={teams.isLoading}
          teamsError={teams.error}
          isSaving={teamAssignment.isSaving}
          successMessage={teamAssignment.result?.message ?? null}
          errorMessage={teamAssignment.error}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedUser(null);
            teamAssignment.reset();
          }}
          onSubmit={handleSubmitAssignment}
          onRefreshTeams={teams.refresh}
        />

        <ChangeRoleModal
          open={isRoleModalOpen}
          user={selectedUser}
          isSaving={roleChange.isSaving}
          successMessage={roleChange.result?.message ?? null}
          errorMessage={roleChange.error}
          onClose={() => {
            setIsRoleModalOpen(false);
            setSelectedUser(null);
            roleChange.reset();
          }}
          onSubmit={handleSubmitRoleChange}
        />

        <DeleteUserDialog
          open={isDeleteDialogOpen}
          user={selectedUser}
          currentUserId={session?.userId}
          isDeleting={userDelete.isDeleting}
          errorMessage={userDelete.error}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedUser(null);
            userDelete.reset();
          }}
          onConfirm={handleSubmitDelete}
        />
      </div>
    </ProtectedLayout>
  );
}
