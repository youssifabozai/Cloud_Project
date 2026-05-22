'use client';

import { useMemo, useState } from 'react';

import { CheckCircle2, Loader2, Users2 } from 'lucide-react';

import { EmptyState } from './empty-state';
import { Modal } from './modal';

import type { Team } from '@/services/teams.service';
import type { UserSummary } from '../types/user.types';

export interface AssignTeamModalProps {
  open: boolean;
  user: UserSummary | null;
  teams: Team[];
  teamsLoading: boolean;
  teamsError?: string | null;
  isSaving: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (teamId: string) => Promise<void>;
  onRefreshTeams?: () => void;
}

export function AssignTeamModal(props: AssignTeamModalProps) {
  const modalStateKey = `${props.open ? 'open' : 'closed'}:${props.user?.userId ?? 'none'}:${props.user?.teamId ?? 'none'}:${props.teams[0]?.teamId ?? 'none'}`;

  return <AssignTeamModalContent key={modalStateKey} {...props} />;
}

function AssignTeamModalContent({
  open,
  user,
  teams,
  teamsLoading,
  teamsError,
  isSaving,
  successMessage,
  errorMessage,
  onClose,
  onSubmit,
  onRefreshTeams,
}: AssignTeamModalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(user?.teamId ?? teams[0]?.teamId ?? '');
  const selectedTeam = useMemo(() => teams.find((team) => team.teamId === selectedTeamId) ?? null, [teams, selectedTeamId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !selectedTeamId.trim()) {
      return;
    }

    await onSubmit(selectedTeamId.trim());
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
        form="assign-team-form"
        disabled={isSaving || !selectedTeamId.trim() || teamsLoading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users2 className="h-4 w-4" />}
        {isSaving ? 'Assigning...' : 'Assign team'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign Team"
      description={user ? `Update the team for ${user.profile?.fullName ?? user.email}.` : 'Choose a user and assign them to an existing team.'}
      footer={footer}
    >
      <form id="assign-team-form" onSubmit={handleSubmit} className="space-y-5">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <div>
                <p className="font-semibold">Assignment complete</p>
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

        <div className="rounded-2xl border border-[var(--border-color)] bg-white/60 p-4 dark:bg-white/8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-sky-500 dark:bg-white/10">
              {user?.profile?.fullName ? user.profile.fullName.charAt(0) : user?.email?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.profile?.fullName ?? user?.email ?? 'Select a user'}</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">{user?.email ?? 'User metadata is unavailable.'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="teamId" className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            Team
          </label>
          <select
            id="teamId"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:bg-white/10"
            disabled={teamsLoading || isSaving}
            required
          >
            <option value="">Select a team</option>
            {teams.map((team) => (
              <option key={team.teamId} value={team.teamId}>
                {team.name} {team.teamId ? `(${team.teamId})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs leading-6 text-[var(--text-secondary)]">
            Assign the user to an existing team. The backend validates the team before saving.
          </p>
        </div>

        {teamsLoading ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-4 py-3 text-sm text-[var(--text-secondary)]">
            Loading teams...
          </div>
        ) : teamsError ? (
          <EmptyState
            title="Unable to load teams"
            description={teamsError}
            className="p-4"
            primaryAction={onRefreshTeams ? { label: 'Retry loading teams', onClick: onRefreshTeams } : undefined}
          />
        ) : selectedTeam ? (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-700 dark:text-sky-300">
            <p className="font-semibold">{selectedTeam.name}</p>
            <p className="mt-1 leading-6">{selectedTeam.description ?? 'No description provided for this team.'}</p>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
