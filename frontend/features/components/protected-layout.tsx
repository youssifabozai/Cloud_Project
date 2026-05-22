'use client';

import type { ReactNode } from 'react';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import type { UserRole } from '@/types';

import { LoadingState } from './loading-state';
import { UnauthorizedState } from './unauthorized-state';
import { useUserLogout, useUserSession } from '../hooks';
import { canRenderForRoles } from '../utils/route-protection';

interface ProtectedLayoutProps {
  children: ReactNode;
  allowedRoles?: readonly UserRole[];
  fallbackPath?: string;
  signOut?: () => Promise<void> | void;
}

export function ProtectedLayout({
  children,
  allowedRoles = [],
  fallbackPath = '/login',
  signOut,
}: ProtectedLayoutProps) {
  const router = useRouter();
  const { session, isLoading, status, reason, refresh } = useUserSession();
  const logout = useUserLogout(signOut, fallbackPath);

  useEffect(() => {
    if (status === 'unauthorized' && (reason === 'missing_token' || reason === 'expired_token')) {
      router.replace(fallbackPath);
    }
  }, [fallbackPath, reason, router, status]);

  if (isLoading) {
    return <LoadingState fullHeight title="Loading workspace" description="Verifying your session and permissions." />;
  }

  if (status === 'forbidden') {
    return (
      <UnauthorizedState
        reason="forbidden_access"
        title="Access denied"
        description="Your account is authenticated, but it does not have access to this area."
        primaryAction={{ label: 'Sign out', onClick: () => { void logout(); } }}
        secondaryAction={{ label: 'Refresh session', onClick: () => { void refresh(); } }}
      />
    );
  }

  if (status === 'unauthorized') {
    const description =
      reason === 'missing_token'
        ? 'No access token was found. Please sign in to continue.'
        : reason === 'expired_token'
          ? 'Your session expired. Sign in again to continue.'
          : 'Your session could not be verified.';

    return (
      <UnauthorizedState
        reason={reason}
        title="Authentication required"
        description={description}
        primaryAction={{ label: 'Go to login', href: fallbackPath }}
        secondaryAction={{ label: 'Refresh session', onClick: () => { void refresh(); } }}
      />
    );
  }

  if (!session) {
    return (
      <LoadingState fullHeight title="Loading workspace" description="Preparing the authenticated session." />
    );
  }

  if (!canRenderForRoles(session.role, allowedRoles)) {
    return (
      <UnauthorizedState
        reason="forbidden_access"
        title="Access restricted"
        description="Your role does not have permission to view this area."
        primaryAction={{ label: 'Sign out', onClick: () => { void logout(); } }}
      />
    );
  }

  return <>{children}</>;
}