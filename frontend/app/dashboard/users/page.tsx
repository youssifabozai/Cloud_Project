'use client';

import React from 'react';
import { ProtectedLayout } from '@/features/components';
import { UsersTable } from '@/features/components';
import { useUsers } from '@/features/hooks';
import { useRbac } from '@/features/hooks/use-rbac';
import { useUserSession } from '@/features/hooks/use-user-session';

export default function UsersManagementPage() {
  const { items, isLoading, error, search, setSearch, roleFilter, setRoleFilter, refresh, canManage } = useUsers();
  const { session } = useUserSession();
  const rbac = useRbac(session?.role ?? null);

  const handleAssign = (userId: string) => {
    const team = prompt('Assign team (enter team id)');
    if (!team) return;
    // Placeholder: call API to assign team; keep business logic outside UsersTable
    alert(`Assigning ${userId} to team ${team} (not implemented)`);
    void refresh();
  };

  const handleChangeRole = (userId: string) => {
    const role = prompt('Change role (ADMIN|MANAGER|EMPLOYEE)');
    if (!role) return;
    alert(`Changing ${userId} role to ${role} (not implemented)`);
    void refresh();
  };

  const handleDelete = (userId: string) => {
    if (!confirm('Delete user? This action cannot be undone.')) return;
    alert(`Deleting ${userId} (not implemented)`);
    void refresh();
  };

  return (
    <ProtectedLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Users Management</h2>
          <div className="flex items-center gap-3">
            <input
              className="px-3 py-2 border rounded-md text-sm"
              placeholder="Search users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="px-3 py-2 border rounded-md text-sm"
              value={roleFilter ?? ''}
              onChange={(e) => setRoleFilter(e.target.value || null)}
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
        </div>

        <UsersTable
          users={items}
          isLoading={isLoading}
          error={error}
          canManage={canManage}
          onAssignTeam={rbac.isAdmin || rbac.isManager ? handleAssign : undefined}
          onChangeRole={rbac.isAdmin || rbac.isManager ? handleChangeRole : undefined}
          onDelete={rbac.isAdmin ? handleDelete : undefined}
        />
      </div>
    </ProtectedLayout>
  );
}
