'use client';

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Camera,
  Loader2,
  Mail,
  Phone,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';

import { LoadingState } from '@/features/components';
import { useAuth } from '@/context/AuthContext';
import { updateCurrentUserProfile } from '@/features/api';
import type { UpdateProfileDto, UserProfile } from '@/types';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
}

interface ProfileFormValues {
  fullName: string;
  avatar: string;
  phoneNumber: string;
}

const EMPTY_VALUES: ProfileFormValues = {
  fullName: '',
  avatar: '',
  phoneNumber: '',
};

function createProfileState(sessionProfile?: UserProfile | null): UserProfile | null {
  if (!sessionProfile) {
    return null;
  }

  return {
    ...sessionProfile,
    fullName: sessionProfile.fullName ?? sessionProfile.name,
    avatar: sessionProfile.avatar ?? '',
    phoneNumber: sessionProfile.phoneNumber ?? '',
  };
}

function profileToFormValues(profile: UserProfile | null): ProfileFormValues {
  if (!profile) {
    return EMPTY_VALUES;
  }

  return {
    fullName: profile.fullName ?? profile.name ?? '',
    avatar: profile.avatar ?? '',
    phoneNumber: profile.phoneNumber ?? '',
  };
}

function getInitials(profile: UserProfile | null): string {
  const source = profile?.fullName ?? profile?.name ?? profile?.email ?? 'User';
  const words = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return words || source.slice(0, 2).toUpperCase();
}

function formatRole(role?: string) {
  return role ? role.charAt(0) + role.slice(1).toLowerCase() : 'Unknown';
}

function formatTeam(teamId?: string) {
  return teamId?.trim() ? teamId : 'Organization-wide';
}

function normalizeTrimmedValue(value: string) {
  return value.trim();
}

function validateAvatarUrl(value: string) {
  const trimmed = normalizeTrimmedValue(value);
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? null
      : 'Avatar URL must use http or https.';
  } catch {
    return 'Enter a valid avatar URL.';
  }
}

function validatePhoneNumber(value: string) {
  const trimmed = normalizeTrimmedValue(value);
  if (!trimmed) {
    return null;
  }

  return /^[+()\d\s-]{7,20}$/.test(trimmed)
    ? null
    : 'Enter a valid phone number.';
}

function ToastStack({ items }: { items: ToastItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-3 sm:right-6 sm:top-6">
      {items.map((item) => {
        const toneClasses =
          item.tone === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/12 text-emerald-50 shadow-[0_18px_50px_-24px_rgba(16,185,129,0.55)]'
            : item.tone === 'error'
              ? 'border-rose-500/20 bg-rose-500/12 text-rose-50 shadow-[0_18px_50px_-24px_rgba(244,63,94,0.55)]'
              : 'border-sky-500/20 bg-sky-500/12 text-sky-50 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.45)]';

        return (
          <div
            key={item.id}
            className={`glass-panel animate-[toast-in_0.2s_ease-out] rounded-2xl border px-4 py-3 backdrop-blur-xl ${toneClasses}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                {item.tone === 'success' ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : item.tone === 'error' ? (
                  <AlertCircle className="h-4.5 w-4.5" />
                ) : (
                  <Sparkles className="h-4.5 w-4.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">{item.title}</p>
                <p className="mt-1 text-xs leading-5 opacity-90">{item.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{children}</label>;
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  error?: string | null;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${error ? 'border-rose-400/40 bg-rose-500/5' : 'border-[var(--border-color)] bg-white/55 dark:bg-white/8'} ${disabled ? 'opacity-70' : ''}`}>
        {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:cursor-not-allowed"
        />
      </div>
      {error && <p className="text-xs font-medium text-rose-500">{error}</p>}
    </label>
  );
}

function ProfilePageContent({
  initialProfile,
  onBack,
  refreshSession,
}: {
  initialProfile: UserProfile;
  onBack: () => void;
  refreshSession: () => Promise<void>;
}) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [formValues, setFormValues] = useState<ProfileFormValues>(profileToFormValues(initialProfile));
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounterRef = useRef(0);

  const isDirty = useMemo(() => {
    const normalizedName = normalizeTrimmedValue(formValues.fullName);
    const normalizedAvatar = normalizeTrimmedValue(formValues.avatar);
    const normalizedPhone = normalizeTrimmedValue(formValues.phoneNumber);

    return (
      normalizedName !== (profile.fullName ?? profile.name ?? '') ||
      normalizedAvatar !== (profile.avatar ?? '') ||
      normalizedPhone !== (profile.phoneNumber ?? '')
    );
  }, [formValues.avatar, formValues.fullName, formValues.phoneNumber, profile]);

  const pushToast = (tone: ToastTone, title: string, message: string) => {
    toastCounterRef.current += 1;
    const id = toastCounterRef.current;
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  };

  const syncFormFromProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setFormValues(profileToFormValues(nextProfile));
    setAvatarFailed(false);
    setFieldErrors({});
  };

  const handleReset = () => {
    syncFormFromProfile(profile);
    pushToast('info', 'Profile reset', 'Your local changes were cleared.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
    const cleanedFullName = normalizeTrimmedValue(formValues.fullName);
    const cleanedAvatar = normalizeTrimmedValue(formValues.avatar);
    const cleanedPhone = normalizeTrimmedValue(formValues.phoneNumber);

    if (cleanedFullName.length < 2) {
      nextErrors.fullName = 'Enter at least 2 characters.';
    }

    const avatarError = validateAvatarUrl(cleanedAvatar);
    if (avatarError) {
      nextErrors.avatar = avatarError;
    }

    const phoneError = validatePhoneNumber(cleanedPhone);
    if (phoneError) {
      nextErrors.phoneNumber = phoneError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      pushToast('error', 'Fix profile fields', 'Please correct the highlighted fields and try again.');
      return;
    }

    const previousProfile = profile;
    const previousValues = formValues;
    const optimisticProfile: UserProfile = {
      ...profile,
      fullName: cleanedFullName,
      avatar: cleanedAvatar || undefined,
      phoneNumber: cleanedPhone || undefined,
    };

    setProfile(optimisticProfile);
    setIsSaving(true);
    setFieldErrors({});

    try {
      const savedProfile = await updateCurrentUserProfile(profile.userId, {
        fullName: cleanedFullName,
        avatar: cleanedAvatar || undefined,
        phoneNumber: cleanedPhone || undefined,
      } satisfies UpdateProfileDto);

      syncFormFromProfile(savedProfile);
      await refreshSession();
      pushToast('success', 'Profile updated', 'Your changes were saved successfully.');
    } catch (error) {
      setProfile(previousProfile);
      setFormValues(previousValues);
      setAvatarFailed(Boolean(previousProfile.avatar));
      pushToast('error', 'Update failed', error instanceof Error ? error.message : 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSrc = profile.avatar?.trim() && !avatarFailed ? profile.avatar.trim() : '';

  return (
    <div className="cloud-page min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <ToastStack items={toasts} />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="cloud-surface glass-panel flex flex-col gap-4 rounded-[28px] border border-[var(--border-color)] px-5 py-5 shadow-premium md:flex-row md:items-end md:justify-between md:px-6">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/60 text-[var(--text-primary)] transition-all hover:-translate-x-0.5 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Self-service profile
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">Profile</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  Keep your identity details current. Changes apply only to your own account and are validated before saving.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:min-w-[24rem]">
            <div className="rounded-2xl border border-[var(--border-color)] bg-white/55 px-4 py-3 dark:bg-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Access</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Own profile only</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white/55 px-4 py-3 dark:bg-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">State</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{isDirty ? 'Unsaved changes' : 'In sync'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-white/55 px-4 py-3 dark:bg-white/8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Profile ID</p>
              <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{profile.userId}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="cloud-surface glass-panel overflow-hidden rounded-[30px] border border-[var(--border-color)] shadow-premium">
            <div className="relative border-b border-[var(--border-color)] px-6 py-6">
              <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_38%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-600 text-2xl font-black text-white shadow-premium">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={profile.fullName ?? profile.name}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        <span>{getInitials(profile)}</span>
                      )}
                    </div>
                    <span className="status-dot absolute -bottom-0.5 -right-0.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-lg">
                      Online
                    </span>
                  </div>

                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Current user</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                      {profile.fullName ?? profile.name}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] dark:bg-white/8">
                        <Shield className="h-3.5 w-3.5 text-sky-500" />
                        {formatRole(profile.role)}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/60 px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] dark:bg-white/8">
                        <Users className="h-3.5 w-3.5 text-cyan-500" />
                        {formatTeam(profile.teamId)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-white/55 px-4 py-3 text-sm text-[var(--text-secondary)] dark:bg-white/8 sm:max-w-xs">
                  <div className="flex items-center gap-2 text-[var(--text-primary)]">
                    <BadgeCheck className="h-4.5 w-4.5 text-emerald-500" />
                    <span className="font-semibold">Self-edit guard</span>
                  </div>
                  <p className="mt-2 leading-6">
                    The backend only accepts updates for your own user ID. The page uses that user ID from the authenticated session automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 p-4 dark:bg-white/8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Email</p>
                <div className="mt-3 flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <Mail className="h-4.5 w-4.5 text-sky-500" />
                  <span className="break-all">{profile.email}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 p-4 dark:bg-white/8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Phone</p>
                <div className="mt-3 flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <Phone className="h-4.5 w-4.5 text-sky-500" />
                  <span>{profile.phoneNumber?.trim() ? profile.phoneNumber : 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 px-4 py-3 dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">User ID</p>
                  <p className="mt-2 truncate text-sm font-semibold text-[var(--text-primary)]">{profile.userId}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 px-4 py-3 dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Editable</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Full name, avatar, phone</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 px-4 py-3 dark:bg-white/8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Security</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Session-backed access</p>
                </div>
              </div>
            </div>
          </section>

          <section className="cloud-surface glass-panel rounded-[30px] border border-[var(--border-color)] p-6 shadow-premium">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Edit profile</p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)]">Update your identity details</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  These fields are validated locally before the update is sent to the backend.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-[var(--border-color)] bg-white/55 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] dark:bg-white/8 lg:block">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-sky-500" />
                  Avatar URLs should be publicly reachable
                </div>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <ProfileField
                label="Full name"
                value={formValues.fullName}
                onChange={(value) => setFormValues((current) => ({ ...current, fullName: value }))}
                placeholder="Jane Doe"
                error={fieldErrors.fullName}
                icon={<UserRound className="h-4.5 w-4.5" />}
              />

              <ProfileField
                label="Avatar URL"
                value={formValues.avatar}
                onChange={(value) => setFormValues((current) => ({ ...current, avatar: value }))}
                placeholder="https://images.example.com/avatar.jpg"
                error={fieldErrors.avatar}
                icon={<Camera className="h-4.5 w-4.5" />}
              />

              <ProfileField
                label="Phone number"
                value={formValues.phoneNumber}
                onChange={(value) => setFormValues((current) => ({ ...current, phoneNumber: value }))}
                placeholder="+1 555 123 4567"
                error={fieldErrors.phoneNumber}
                icon={<Phone className="h-4.5 w-4.5" />}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 p-4 dark:bg-white/8">
                  <FieldLabel>Email</FieldLabel>
                  <p className="mt-2 break-all text-sm font-medium text-[var(--text-primary)]">{profile.email}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Read-only identity field</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-white/50 p-4 dark:bg-white/8">
                  <FieldLabel>Role & team</FieldLabel>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                    {formatRole(profile.role)} | {formatTeam(profile.teamId)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Controlled by the backend session</p>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-500/15 bg-sky-500/5 px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-500" />
                  <p>
                    The profile update is optimistic. You will see the new values immediately, then the session is refreshed in the background to keep the dashboard shell in sync.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSaving || !isDirty}
                  className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/60 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/8 dark:hover:bg-white/12"
                >
                  Reset changes
                </button>

                <button
                  type="submit"
                  disabled={isSaving || !isDirty}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(14,165,233,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-18px_rgba(14,165,233,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                  {isSaving ? 'Saving changes' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const sessionProfile = useMemo(() => createProfileState(auth.session?.profile ?? null), [auth.session?.profile]);

  if (auth.isLoading || !sessionProfile) {
    return (
      <div className="cloud-page flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-8">
        <LoadingState
          fullHeight
          title="Loading profile"
          description="Fetching your current account details and preparing the edit view."
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          className="mx-auto my-auto max-w-3xl"
        />
      </div>
    );
  }

  const profileKey = [sessionProfile.userId, sessionProfile.fullName ?? '', sessionProfile.avatar ?? '', sessionProfile.phoneNumber ?? ''].join(':');

  return (
    <ProfilePageContent
      key={profileKey}
      initialProfile={sessionProfile}
      onBack={() => router.push('/dashboard')}
      refreshSession={auth.refreshSession}
    />
  );
}
