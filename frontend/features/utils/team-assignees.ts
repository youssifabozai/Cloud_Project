import type { Team } from '@/services/teams.service';

export type AssigneeCandidate = {
  userId: string;
  name: string;
  role: string;
  teamId: string;
};

const INVALID_TEAM_IDS = new Set(['', 'none', 'null', 'undefined', 'n/a']);

type RawUser = {
  userId: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  teamId?: string | null;
};

export function toAssigneeCandidate(u: RawUser): AssigneeCandidate | null {
  const userId = String(u.userId ?? '').trim();
  if (!userId) {
    return null;
  }

  const teamId =
    u.teamId === undefined || u.teamId === null
      ? ''
      : String(u.teamId).trim();

  if (INVALID_TEAM_IDS.has(teamId.toLowerCase())) {
    return null;
  }

  const name = (u.fullName || u.name || u.email?.split('@')[0] || 'User').trim();
  if (!name || name.toLowerCase() === 'none') {
    return null;
  }

  return {
    userId,
    name,
    role: String(u.role || 'EMPLOYEE').trim().toUpperCase(),
    teamId,
  };
}

export function dedupeAssignees(users: (AssigneeCandidate | null)[]): AssigneeCandidate[] {
  const map = new Map<string, AssigneeCandidate>();
  for (const u of users) {
    if (!u?.userId) continue;
    if (!map.has(u.userId)) {
      map.set(u.userId, u);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Match users on a team (UUID, legacy name, team_frontend, etc.) */
export function filterUsersForTeam(
  users: AssigneeCandidate[],
  teamId: string,
  teams: Team[],
): AssigneeCandidate[] {
  const teamMeta = teams.find((t) => t.teamId === teamId);
  const keys = new Set<string>([teamId]);
  if (teamMeta?.name) {
    keys.add(teamMeta.name);
  }
  if (keys.has('Frontend')) {
    keys.add('team_frontend');
  }
  if (keys.has('team_frontend')) {
    keys.add('Frontend');
  }

  return dedupeAssignees(
    users.filter((u) => keys.has(u.teamId)),
  );
}

/** Task assignees: employees on this team only (no org-wide fallback) */
export function assigneesForTaskDropdown(
  teamMembers: AssigneeCandidate[],
): AssigneeCandidate[] {
  const deduped = dedupeAssignees(teamMembers);
  const employees = deduped.filter((u) => u.role === 'EMPLOYEE');
  return employees.length > 0 ? employees : deduped;
}

export function pickDefaultAssigneeId(members: AssigneeCandidate[]): string {
  const options = assigneesForTaskDropdown(members);
  if (options.length === 0) {
    return '';
  }
  return options[0].userId;
}
