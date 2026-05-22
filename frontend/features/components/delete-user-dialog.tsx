'use client';

import { useMemo, useState } from 'react';

import { ShieldAlert, UserX } from 'lucide-react';

import { DestructiveConfirmDialog } from './destructive-confirm-dialog';

import type { UserSummary } from '../types/user.types';

interface DeleteUserDialogProps {
  open: boolean;
  user: UserSummary | null;
  currentUserId?: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteUserDialog(props: DeleteUserDialogProps) {
  const dialogStateKey = `${props.open ? 'open' : 'closed'}:${props.user?.userId ?? 'none'}`;

  return <DeleteUserDialogContent key={dialogStateKey} {...props} />;
}

function DeleteUserDialogContent({
  open,
  user,
  currentUserId,
  isDeleting,
  errorMessage,
  onClose,
  onConfirm,
}: DeleteUserDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const isSelfDelete = useMemo(() => Boolean(user && currentUserId && user.userId === currentUserId), [currentUserId, user]);
  const isOtherAdmin = useMemo(() => Boolean(user && user.role === 'ADMIN' && user.userId !== currentUserId), [currentUserId, user]);

  const blockedMessage = useMemo(() => {
    if (isSelfDelete) {
      return 'You cannot delete your own account. Sign in with a different admin account to proceed.';
    }

    if (isOtherAdmin) {
      return 'Deleting another ADMIN account is forbidden by policy.';
    }

    return null;
  }, [isOtherAdmin, isSelfDelete]);

  const warning = blockedMessage ?? 'This action permanently deletes the user account and cannot be undone.';

  return (
    <DestructiveConfirmDialog
      open={open}
      title="Delete user"
      description={user ? `Confirm deletion for ${user.profile?.fullName ?? user.email}.` : 'Confirm user deletion.'}
      warning={warning}
      errorMessage={errorMessage}
      isLoading={isDeleting}
      confirmLabel="Delete user"
      confirmDisabled={Boolean(blockedMessage) || !acknowledged}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-rose-500 dark:bg-white/10">
            {blockedMessage ? <ShieldAlert className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.profile?.fullName ?? user?.email ?? 'Selected user'}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">User ID: {user?.userId ?? 'N/A'} | Role: {user?.role ?? 'Unknown'}</p>
          </div>
        </div>
      </div>

      {!blockedMessage ? (
        <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-white/60 px-4 py-3 text-sm text-[var(--text-secondary)] dark:bg-white/8">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-color)]"
          />
          <span>I understand this action is irreversible and will permanently delete the user account.</span>
        </label>
      ) : null}
    </DestructiveConfirmDialog>
  );
}
