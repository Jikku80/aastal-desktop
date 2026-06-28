'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function useAuth() {
  const { user, clinic, isAuthenticated, setAuth, logout } = useAuthStore();
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data),
    onSuccess: async(res) => {
      const { user, clinic, accessToken, refreshToken } = res.data;
      setAuth(user, clinic);
      await Promise.resolve();
      toast.success(`Welcome back, ${user.firstName}!`);
      router.replace('/dashboard');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Login failed'),
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      window.location.href = '/auth/login';
    },
  });

  const requireAuth = () => {
    if (!isAuthenticated) window.location.href = '/auth/login';
  };

  return {
    user,
    clinic,
    isAuthenticated,
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    logout: logoutMutation.mutate,
    requireAuth,
  };
}

export function useRequireRole(roles: string[]) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) { window.location.href = '/auth/login'; return; }
    if (user && !roles.includes(user.role)) { router.push('/dashboard'); }
  }, [isAuthenticated, user, roles, router]);

  return { user, hasAccess: user ? roles.includes(user.role) : false };
}
