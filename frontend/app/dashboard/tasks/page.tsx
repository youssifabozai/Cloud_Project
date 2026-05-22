'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  KanbanSquare,
  MessageSquare,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmptyState, LoadingState, Modal } from '@/features/components';
import { commentsService } from '@/services/comments.service';
import { tasksService } from '@/services/tasks.service';
import type { Comment, TaskStatus } from '@/types';

type TaskPriority = 'Low' | 'Medium' | 'High';

interface TaskRecord {
  taskId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  assigneeId: string;
  assigneeName?: string;
  teamId: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
}

const statuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

const nextStatusByStatus: Partial<Record<TaskStatus, TaskStatus>> = {
  'To Do': 'In Progress',
  'In Progress': 'In Review',
  'In Review': 'Done',
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Request failed. Please try again.';
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'No date';
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

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'No date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function priorityClass(priority?: string) {
  if (priority === 'High') {
    return 'border-red-500/25 bg-red-500/10 text-red-600';
  }

  if (priority === 'Medium') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
}

export default function TasksBoardPage() {
  const auth = useAuth();
  const { pushToast } = useToast();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [areCommentsLoading, setAreCommentsLoading] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextTasks = await tasksService.getAll();
      setTasks(nextTasks as TaskRecord[]);
    } catch (requestError) {
      const message = errorMessage(requestError);
      setError(message);
      pushToast('error', 'Tasks unavailable', message);
    } finally {
      setIsLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!auth.isLoading && auth.session) {
      void loadTasks();
    }
  }, [auth.isLoading, auth.session, loadTasks]);

  const tasksByStatus = useMemo(() => {
    return statuses.reduce<Record<TaskStatus, TaskRecord[]>>((groups, status) => {
      groups[status] = tasks.filter((task) => task.status === status);
      return groups;
    }, {
      'To Do': [],
      'In Progress': [],
      'In Review': [],
      Done: [],
    });
  }, [tasks]);

  const loadComments = useCallback(async (taskId: string) => {
    setAreCommentsLoading(true);
    setCommentsError(null);

    try {
      const nextComments = await commentsService.getByTaskId(taskId);
      setComments(
        [...nextComments].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
    } catch (requestError) {
      const message = errorMessage(requestError);
      setComments([]);
      setCommentsError(message);
      pushToast('error', 'Comments unavailable', message);
    } finally {
      setAreCommentsLoading(false);
    }
  }, [pushToast]);

  const openTask = async (task: TaskRecord) => {
    setSelectedTask(task);
    setComments([]);
    setCommentDraft('');
    setCommentsError(null);

    try {
      const freshTask = await tasksService.getById(task.taskId);
      setSelectedTask(freshTask as TaskRecord);
      void loadComments(task.taskId);
    } catch (requestError) {
      pushToast('error', 'Task details unavailable', errorMessage(requestError));
    }
  };

  const closeTask = () => {
    setSelectedTask(null);
    setComments([]);
    setCommentDraft('');
    setCommentsError(null);
  };

  const updateStatus = async (task: TaskRecord, status: TaskStatus) => {
    setIsUpdatingTaskId(task.taskId);

    try {
      const result = await tasksService.updateStatus(task.taskId, status);
      const updatedAt = 'updatedAt' in result ? String(result.updatedAt) : new Date().toISOString();
      const closedAt = 'closedAt' in result ? (result.closedAt as string | null) : status === 'Done' ? updatedAt : null;

      const updateTask = (current: TaskRecord) =>
        current.taskId === task.taskId
          ? { ...current, status, updatedAt, closedAt }
          : current;

      setTasks((current) => current.map(updateTask));
      setSelectedTask((current) => (current ? updateTask(current) : current));
      pushToast('success', 'Status updated', `${task.title} moved to ${status}.`);
    } catch (requestError) {
      pushToast('error', 'Status update failed', errorMessage(requestError));
    } finally {
      setIsUpdatingTaskId(null);
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = commentDraft.trim();
    if (!selectedTask || !text) {
      return;
    }

    setIsSubmittingComment(true);

    try {
      const createdComment = await commentsService.create({
        taskId: selectedTask.taskId,
        text,
      });

      setComments((current) =>
        [...current, createdComment].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      setCommentDraft('');
      pushToast('success', 'Comment added', 'Your comment was saved.');
    } catch (requestError) {
      pushToast('error', 'Comment failed', errorMessage(requestError));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (auth.isLoading || !auth.session) {
    return (
      <main className="cloud-page min-h-screen px-5 py-8">
        <LoadingState fullHeight title="Loading board" description="Checking your workspace session." />
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
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
              <KanbanSquare className="h-8 w-8 text-[var(--primary)]" />
              Task Board
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              Team-scoped tasks from the backend Tasks API, grouped by the required lifecycle columns.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTasks()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        {isLoading ? (
          <LoadingState title="Loading task board" description="Fetching tasks from the protected backend route." />
        ) : error ? (
          <EmptyState
            title="Task board could not be loaded"
            description={error}
            icon={<AlertTriangle className="h-6 w-6" />}
            primaryAction={{ label: 'Retry', onClick: () => void loadTasks() }}
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="The Tasks API returned an empty list for your current role and team."
            icon={<KanbanSquare className="h-6 w-6" />}
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-4">
            {statuses.map((status) => (
              <div key={status} className="cloud-card flex min-h-[420px] flex-col rounded-2xl p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold">{status}</h2>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {tasksByStatus[status].length} task{tasksByStatus[status].length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                    {tasksByStatus[status].length}
                  </span>
                </div>

                {tasksByStatus[status].length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-4 text-center text-xs leading-5 text-[var(--text-secondary)]">
                    No tasks in {status}.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tasksByStatus[status].map((task) => {
                      const nextStatus = nextStatusByStatus[task.status];
                      return (
                        <article
                          key={task.taskId}
                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-sm"
                        >
                          <button type="button" onClick={() => void openTask(task)} className="block w-full text-left">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="line-clamp-2 text-sm font-bold">{task.title}</h3>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorityClass(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">
                              {task.description || 'No description provided.'}
                            </p>
                            <div className="mt-4 grid gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(task.deadline)}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <UserRound className="h-3.5 w-3.5" />
                                {task.assigneeName || task.assigneeId}
                              </span>
                            </div>
                          </button>

                          {nextStatus ? (
                            <button
                              type="button"
                              disabled={isUpdatingTaskId === task.taskId}
                              onClick={() => void updateStatus(task, nextStatus)}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdatingTaskId === task.taskId ? (
                                <Clock3 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                              Move to {nextStatus}
                            </button>
                          ) : (
                            <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Done
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </div>

      <Modal
        open={Boolean(selectedTask)}
        title={selectedTask?.title ?? 'Task details'}
        description={selectedTask ? `${selectedTask.status} - ${selectedTask.teamId}` : undefined}
        onClose={closeTask}
        maxWidthClassName="max-w-3xl"
      >
        {selectedTask && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Description</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
                    Comments
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadComments(selectedTask.taskId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--primary)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                </div>

                <div className="mt-4">
                  {areCommentsLoading ? (
                    <LoadingState title="Loading comments" description="Fetching the task discussion." />
                  ) : commentsError ? (
                    <EmptyState
                      title="Comments could not be loaded"
                      description={commentsError}
                      icon={<AlertTriangle className="h-6 w-6" />}
                      primaryAction={{ label: 'Retry', onClick: () => void loadComments(selectedTask.taskId) }}
                    />
                  ) : comments.length === 0 ? (
                    <EmptyState
                      title="No comments yet"
                      description="Start the task discussion with the first comment."
                      icon={<MessageSquare className="h-6 w-6" />}
                    />
                  ) : (
                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      {comments.map((comment) => (
                        <article
                          key={comment.commentId}
                          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold">{comment.authorName || comment.authorId || 'Unknown user'}</span>
                            <time className="text-xs font-semibold text-[var(--text-secondary)]">
                              {formatDateTime(comment.createdAt)}
                            </time>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                            {comment.text}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={submitComment} className="mt-4 space-y-3">
                  <label className="grid gap-2 text-sm font-semibold">
                    Add comment
                    <textarea
                      value={commentDraft}
                      onChange={(event) => setCommentDraft(event.target.value)}
                      className="min-h-24 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)]"
                      placeholder="Write a comment..."
                      maxLength={4000}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentDraft.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-premium transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmittingComment ? (
                      <Clock3 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    {isSubmittingComment ? 'Posting' : 'Post comment'}
                  </button>
                </form>
              </div>
            </section>

            <aside className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Status</p>
                <p className="mt-1 font-semibold">{selectedTask.status}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Priority</p>
                <p className="mt-1 font-semibold">{selectedTask.priority}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Assignee</p>
                <p className="mt-1 break-all font-semibold">{selectedTask.assigneeName || selectedTask.assigneeId}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Team</p>
                <p className="mt-1 break-all font-semibold">{selectedTask.teamId}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Deadline</p>
                <p className="mt-1 font-semibold">{formatDate(selectedTask.deadline)}</p>
              </div>
              {selectedTask.closedAt ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Closed</p>
                  <p className="mt-1 font-semibold">{formatDate(selectedTask.closedAt)}</p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={closeTask}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs font-bold"
              >
                <X className="h-3.5 w-3.5" />
                Close
              </button>
            </aside>
          </div>
        )}
      </Modal>
    </main>
  );
}
