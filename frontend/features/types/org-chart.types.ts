import type { OrgChartData, OrgChartFullData, OrgChartRestrictedData, OrgChartSummary, OrgChartTeamNode, OrgChartUserNode } from '@/services/users.service';

export type { OrgChartData, OrgChartFullData, OrgChartRestrictedData, OrgChartSummary, OrgChartTeamNode, OrgChartUserNode };

export interface OrgChartViewModel {
  scope: 'ALL' | 'TEAM';
  summary?: OrgChartSummary;
  admins: OrgChartUserNode[];
  managers: OrgChartUserNode[];
  teams: OrgChartTeamNode[];
  unassignedEmployees: OrgChartUserNode[];
  team: OrgChartRestrictedData['team'];
  members: OrgChartUserNode[];
}

export function createEmptyOrgChart(): OrgChartViewModel {
  return {
    scope: 'TEAM',
    admins: [],
    managers: [],
    teams: [],
    unassignedEmployees: [],
    team: null,
    members: [],
  };
}

export function isFullOrgChart(data: OrgChartData): data is OrgChartFullData {
  return data.scope === 'ALL';
}