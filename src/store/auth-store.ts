import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, UserRole } from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  hasRole: (role: UserRole) => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  roles: UserRole[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, _password: string) => {
        set({ isLoading: true });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Find mock user or create one based on email
        let user = mockUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
          // Create a new user for demo purposes
          user = {
            ...mockUsers[0],
            id: `user-${Date.now()}`,
            email,
            name: email.split("@")[0],
            username: email.split("@")[0].toLowerCase(),
          };
        }

        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const newUser: User = {
          id: `user-${Date.now()}`,
          email: data.email,
          name: data.name,
          username: data.name.toLowerCase().replace(/\s+/g, ""),
          roles: data.roles,
          skills: [],
          interests: [],
          eventsAttended: 0,
          hackathonsParticipated: 0,
          projectsSubmitted: 0,
          wins: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({ user: newUser, isAuthenticated: true, isLoading: false });
        return true;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      updateUser: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({
            user: {
              ...user,
              ...data,
              updatedAt: new Date().toISOString(),
            },
          });
        }
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        return user?.roles?.includes(role) ?? false;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
