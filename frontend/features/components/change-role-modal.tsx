'use client';

import { useMemo, useState } from 'react';

import { CheckCircle2, Loader2, Shield } from 'lucide-react';

import { Modal } from './modal';

import type { UserSummary } from '../types/user.types';
import type { UserRole } from '@/types';

const ROLE_OPTIONS: readonly UserRole[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export interface ChangeRoleModalProps {
  open: boolean;
  user: UserSummary | null;
  isSaving: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (role: UserRole) => Promise<void>;
}

export function ChangeRoleModal(props: ChangeRoleModalProps) {
  const modalStateKey = `${props.open ? 'open' : 'closed'}:${props.user?.userId ?? 'none'}:${props.user?.role ?? 'EMPLOYEE'}`;

  return <ChangeRoleModalContent key={modalStateKey} {...props} />;
}

function ChangeRoleModalContent({
  open,
  user,
  isSaving,
  successMessage,
  errorMessage,
  onClose,
  onSubmit,
}: ChangeRoleModalProps) {
  const initialRole = (user?.role ?? 'EMPLOYEE') as UserRole;
  const [selectedRole, setSelectedRole] = useState<UserRole>(ROLE_OPTIONS.includes(initialRole) ? initialRole : 'EMPLOYEE');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const hasChanges = useMemo(() => Boolean(user && user.role !== selectedRole), [selectedRole, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      setValidationMessage('Select a valid user before updating role.');
      return;
    }

    if (!ROLE_OPTIONS.includes(selectedRole)) {
      setValidationMessage('Role must be ADMIN, MANAGER, or EMPLOYEE.');
      return;
    }

    if (!hasChanges) {
      setValidationMessage('Select a different role to apply an update.');
      return;
    }

    setValidationMessage(null);
    await onSubmit(selectedRole);
  };

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
      >
        Close
      </button>
      <button
        type="submit"
        form="change-role-form"
        disabled={isSaving}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
        {isSaving ? 'Updating...' : 'Update role'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Role"
      description={user ? `Update the role for ${user.profile?.fullName ?? user.email}.` : 'Choose a user and assign a new role.'}
      footer={footer}
      maxWidthClassName="max-w-xl"
    >
      <form id="change-role-form" onSubmit={handleSubmit} className="space-y-5">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <div>
                <p className="font-semibold">Role updated</p>
                <p className="mt-1 leading-6">{successMessage}</p>
              </div>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {validationMessage ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            {validationMessage}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-sky-500 dark:bg-white/10">
              {user?.profile?.fullName ? user.profile.fullName.charAt(0) : user?.email?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.profile?.fullName ?? user?.email ?? 'Select a user'}</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">Current role: {user?.role ?? 'Unknown'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Role
          </label>
          <select
            id="role"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as UserRole)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-white/10"
            disabled={isSaving}
            required
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <p className="text-xs leading-6 text-[var(--text-secondary)]">
            Allowed values are ADMIN, MANAGER, and EMPLOYEE.
          </p>
        </div>
      </form>
    </Modal>
  );
}
