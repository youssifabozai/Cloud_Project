'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Edit3,
  Eye,
  FolderKanban,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmptyState, LoadingState } from '@/features/components';
import {
  projectsService,
  type CreateProjectPayload,
  type ProjectRecord,
  type ProjectStatus,
} from '@/services/projects.service';

interface ProjectFormState {
  name: string;
  description: string;
  status: ProjectStatus;
  deadline: string;
  assignedUserIds: string;
  assignedTeamIds: string;
}

const emptyForm: ProjectFormState = {
  name: '',
  description: '',
  status: 'ACTIVE',
  deadline: '',
  assignedUserIds: '',
  assignedTeamIds: '',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed. Please try again.';
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function listToInput(values?: string[]) {
  return values?.join(', ') ?? '';
}

function inputToList(value: string) {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function projectToForm(project: ProjectRecord): ProjectFormState {
  const deadline = project.deadline ? project.deadline.slice(0, 10) : '';

  return {
    name: project.name ?? '',
    description: project.description ?? '',
    status: project.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
    deadline,
    assignedUserIds: listToInput(project.assignedUserIds),
    assignedTeamIds: listToInput(project.assignedTeamIds),
  };
}

function buildPayload(form: ProjectFormState): CreateProjectPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    deadline: form.deadline || undefined,
    assignedUserIds: inputToList(form.assignedUserIds),
    assignedTeamIds: inputToList(form.assignedTeamIds),
  };
}

export default function ProjectsPage() {
  const auth = useAuth();
  const { pushToast } = useToast();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageProjects = auth.isManager || auth.isAdmin;

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextProjects = await projectsService.getAll();
      setProjects(nextProjects);
    } catch (requestError) {
      const message = errorMessage(requestError);
      setError(message);
      pushToast('error', 'Projects unavailable', message);
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!auth.isLoading && auth.session) {
      void loadProjects();
    }
  }, [auth.isLoading, auth.session, loadProjects]);

  const projectCounts = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((project) => project.status !== 'COMPLETED').length,
      completed: projects.filter((project) => project.status === 'COMPLETED').length,
    };
  }, [projects]);

  const openCreateForm = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (project: ProjectRecord) => {
    setEditingProject(project);
    setForm(projectToForm(project));
    setIsFormOpen(true);
  };

  const openDetails = async (projectId: string) => {
    try {
      const project = await projectsService.getById(projectId);
      setSelectedProject(project);
    } catch (requestError) {
      pushToast('error', 'Project details unavailable', errorMessage(requestError));
    }
  };

  const saveProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageProjects) {
      pushToast('error', 'Action blocked', 'Only Manager/Admin users can manage projects.');
      return;
    }

    if (!form.name.trim()) {
      pushToast('error', 'Project name required', 'Enter a project name before saving.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload(form);
      const savedProject = editingProject
        ? await projectsService.update(editingProject.projectId, payload)
        : await projectsService.create(payload);

      setProjects((current) => {
        if (!editingProject) {
          return [savedProject, ...current];
        }

        return current.map((project) =>
          project.projectId === savedProject.projectId ? savedProject : project,
        );
      });

      if (selectedProject?.projectId === savedProject.projectId) {
        setSelectedProject(savedProject);
      }

      setIsFormOpen(false);
      setEditingProject(null);
      setForm(emptyForm);
      pushToast(
        'success',
        editingProject ? 'Project updated' : 'Project created',
        savedProject.name,
      );
    } catch (requestError) {
      pushToast('error', 'Project save failed', errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProject = async (project: ProjectRecord) => {
    if (!canManageProjects) {
      pushToast('error', 'Action blocked', 'Only Manager/Admin users can delete projects.');
      return;
    }

    const confirmed = window.confirm(`Delete project "${project.name}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await projectsService.remove(project.projectId);
      setProjects((current) => current.filter((item) => item.projectId !== project.projectId));

      if (selectedProject?.projectId === project.projectId) {
        setSelectedProject(null);
      }

      pushToast('success', 'Project deleted', project.name);
    } catch (requestError) {
      pushToast('error', 'Project delete failed', errorMessage(requestError));
    }
  };

  if (auth.isLoading || !auth.session) {
    return (
      <main className="cloud-page min-h-screen px-5 py-8">
        <LoadingState fullHeight title="Loading projects" description="Checking your workspace session." />
      </main>
    );
  }

  return (
    <main className="cloud-page min-h-screen px-5 py-8 text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)]">
              Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Manage company project records from the backend Projects API.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadProjects()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {canManageProjects && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-premium transition hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            )}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['Total projects', projectCounts.total],
            ['Active projects', projectCounts.active],
            ['Completed projects', projectCounts.completed],
          ].map(([label, value]) => (
            <div key={label} className="cloud-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        {isLoading ? (
          <LoadingState title="Loading projects" description="Fetching project records from DynamoDB through the backend." />
        ) : error ? (
          <EmptyState
            title="Projects could not be loaded"
            description={error}
            icon={<FolderKanban className="h-6 w-6" />}
            primaryAction={{ label: 'Retry', onClick: () => void loadProjects() }}
          />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to start tracking work by users and teams."
            icon={<FolderKanban className="h-6 w-6" />}
            primaryAction={canManageProjects ? { label: 'Create project', onClick: openCreateForm } : undefined}
          />
        ) : (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4">
              {projects.map((project) => (
                <article key={project.projectId} className="cloud-card rounded-2xl p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{project.name}</h2>
                        <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          {project.status ?? 'ACTIVE'}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {project.description || 'No description provided.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(project.deadline)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {(project.assignedUserIds?.length ?? 0)} users, {(project.assignedTeamIds?.length ?? 0)} teams
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void openDetails(project.projectId)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canManageProjects && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditForm(project)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                            title="Edit project"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteProject(project)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-600 transition hover:bg-red-500/15"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="cloud-card h-fit rounded-2xl p-5">
              {selectedProject ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Selected project</p>
                      <h2 className="mt-2 text-xl font-bold">{selectedProject.name}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProject(null)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)]"
                      title="Close details"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {selectedProject.description || 'No description provided.'}
                  </p>

                  <dl className="grid gap-3 text-sm">
                    <div>
                      <dt className="font-semibold">Project ID</dt>
                      <dd className="mt-1 break-all text-[var(--text-secondary)]">{selectedProject.projectId}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Deadline</dt>
                      <dd className="mt-1 text-[var(--text-secondary)]">{formatDate(selectedProject.deadline)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Assigned users</dt>
                      <dd className="mt-1 text-[var(--text-secondary)]">
                        {selectedProject.assignedUserIds?.join(', ') || 'None'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Assigned teams</dt>
                      <dd className="mt-1 text-[var(--text-secondary)]">
                        {selectedProject.assignedTeamIds?.join(', ') || 'None'}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <EmptyState
                  title="Select a project"
                  description="Open a project record to inspect its backend details."
                  icon={<Eye className="h-6 w-6" />}
                />
              )}
            </aside>
          </section>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={saveProject} className="cloud-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  {editingProject ? 'Edit project' : 'New project'}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{editingProject ? editingProject.name : 'Create project'}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)]"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Project name
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="Mini-Jira AWS"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="min-h-28 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="Project scope and delivery notes"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProjectStatus }))}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold">
                  Deadline
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                Assigned user IDs
                <input
                  value={form.assignedUserIds}
                  onChange={(event) => setForm((current) => ({ ...current, assignedUserIds: event.target.value }))}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="user_sara, user_omar"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Assigned team IDs
                <input
                  value={form.assignedTeamIds}
                  onChange={(event) => setForm((current) => ({ ...current, assignedTeamIds: event.target.value }))}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                  placeholder="team_frontend, team_backend"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-premium disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving' : 'Save project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
