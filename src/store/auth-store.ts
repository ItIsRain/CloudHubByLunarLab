import { create } from "zustand";
import { User, UserRole } from "@/lib/types";
import { profileToUser } from "@/lib/supabase/mappers";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  fetchUser: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  hasRole: (role: UserRole) => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

// Map camelCase User fields to snake_case for DB update
function userToProfileUpdate(
  data: Partial<User>
): Record<string, unknown> {
  const map: Record<string, string> = {
    name: "name",
    username: "username",
    avatar: "avatar",
    bio: "bio",
    headline: "headline",
    location: "location",
    website: "website",
    github: "github",
    twitter: "twitter",
    linkedin: "linkedin",
    skills: "skills",
    interests: "interests",
    roles: "roles",
    eventsAttended: "events_attended",
    hackathonsParticipated: "hackathons_participated",
    projectsSubmitted: "projects_submitted",
    wins: "wins",
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const dbKey = map[key];
    if (dbKey) result[dbKey] = value;
  }
  return result;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Login failed");
      }

      if (json.profile) {
        set({
          user: profileToUser(json.profile),
          isAuthenticated: true,
          isLoading: false,
        });
      }

      return true;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true });

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          roles: data.roles,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Registration failed");
      }

      // Don't fetch user — no session until email is verified
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (data: Partial<User>) => {
    const dbUpdates = userToProfileUpdate(data);

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbUpdates),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Update failed");
    }

    if (json.profile) {
      set({ user: profileToUser(json.profile) });
    }
  },

  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me");

      if (!res.ok) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      const json = await res.json();

      if (json.profile) {
        set({
          user: profileToUser(json.profile),
          isAuthenticated: true,
        });
      }
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  deleteAccount: async () => {
    const res = await fetch("/api/auth/me", { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Delete failed");
    }

    set({ user: null, isAuthenticated: false });
    return true;
  },

  hasRole: (role: UserRole) => {
    const { user } = get();
    return user?.roles?.includes(role) ?? false;
  },
}));
