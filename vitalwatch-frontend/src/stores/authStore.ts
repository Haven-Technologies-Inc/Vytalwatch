import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types";
import { config } from "@/config";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      login: async (email, password) => {
        set({ isLoading: true });

        try {
          const response = await fetch(`${config.api.baseUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Invalid email or password");
          }

          set({
            user: data.data?.user || data.user,
            isAuthenticated: true,
            isLoading: false,
            accessToken: data.data?.accessToken || data.accessToken,
            refreshToken: data.data?.refreshToken || data.refreshToken,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error instanceof Error ? error : new Error("Login failed");
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true });
        window.location.href = `${config.api.baseUrl}/auth/google`;
      },

      loginWithMicrosoft: async () => {
        set({ isLoading: true });
        window.location.href = `${config.api.baseUrl}/auth/microsoft`;
      },

      loginWithApple: async () => {
        set({ isLoading: true });
        window.location.href = `${config.api.baseUrl}/auth/apple`;
      },

      logout: async () => {
        const { accessToken } = get();
        
        if (accessToken) {
          try {
            await fetch(`${config.api.baseUrl}/auth/logout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            });
          } catch {
            // Ignore logout errors
          }
        }

        set({
          user: null,
          isAuthenticated: false,
          accessToken: null,
          refreshToken: null,
        });
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await fetch(`${config.api.baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error("Token refresh failed");
          }

          set({
            accessToken: data.data?.accessToken || data.accessToken,
            refreshToken: data.data?.refreshToken || data.refreshToken || refreshToken,
          });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "vytalwatch-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// Helper function to get redirect path based on role
export function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "patient":
      return "/patient/dashboard";
    case "provider":
      return "/provider/dashboard";
    case "admin":
    case "superadmin":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
