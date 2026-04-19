import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EventType,
  EntityVisibility,
  Track,
  Prize,
  Sponsor,
  JudgingCriteria,
  FormField,
} from "@/lib/types";

interface HackathonFormState {
  currentSection: number;
  // Basic Info
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
  logo: string;
  /**
   * Categories assigned to the hackathon. Lowercased strings; any entry
   * not in the preset list is a custom category typed via "Other". Always
   * treated as a set (dedup + sort is handled at render time).
   */
  categories: string[];
  tags: string[];
  type: EventType;
  // Location
  address: string;
  city: string;
  country: string;
  platform: string;
  meetingUrl: string;
  // Timeline
  registrationStart: string;
  registrationEnd: string;
  hackingStart: string;
  hackingEnd: string;
  submissionDeadline: string;
  judgingStart: string;
  judgingEnd: string;
  winnersAnnouncement: string;
  // Tracks & Prizes
  tracks: Track[];
  prizes: Prize[];
  // Rules
  rules: string;
  eligibility: string[];
  // Team Settings
  minTeamSize: number;
  maxTeamSize: number;
  allowSolo: boolean;
  // Judging
  judgingCriteria: JudgingCriteria[];
  // Sponsors
  sponsors: Sponsor[];
  // Registration Form
  registrationFields: FormField[];
  // Visibility
  visibility: EntityVisibility;

  // Actions
  setSection: (section: number) => void;
  updateField: <K extends keyof HackathonFormState>(key: K, value: HackathonFormState[K]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addPrize: (prize: Prize) => void;
  removePrize: (id: string) => void;
  addSponsor: (sponsor: Sponsor) => void;
  removeSponsor: (id: string) => void;
  addCriteria: (criteria: JudgingCriteria) => void;
  removeCriteria: (id: string) => void;
  addEligibility: (rule: string) => void;
  removeEligibility: (index: number) => void;
  resetForm: () => void;
}

const initialState = {
  currentSection: 0,
  name: "",
  tagline: "",
  description: "",
  coverImage: "",
  logo: "",
  categories: [] as string[],
  tags: [],
  type: "online" as EventType,
  address: "",
  city: "",
  country: "",
  platform: "",
  meetingUrl: "",
  registrationStart: "",
  registrationEnd: "",
  hackingStart: "",
  hackingEnd: "",
  submissionDeadline: "",
  judgingStart: "",
  judgingEnd: "",
  winnersAnnouncement: "",
  tracks: [],
  prizes: [],
  rules: "",
  eligibility: [],
  minTeamSize: 1,
  maxTeamSize: 4,
  allowSolo: true,
  judgingCriteria: [],
  sponsors: [],
  registrationFields: [],
  visibility: "public" as EntityVisibility,
};

export const useHackathonFormStore = create<HackathonFormState>()(
  persist(
    (set) => ({
      ...initialState,

      setSection: (section) => set({ currentSection: section }),

      updateField: (key, value) => set({ [key]: value }),

      addTrack: (track) =>
        set((state) => ({ tracks: [...state.tracks, track] })),
      removeTrack: (id) =>
        set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),

      addPrize: (prize) =>
        set((state) => ({ prizes: [...state.prizes, prize] })),
      removePrize: (id) =>
        set((state) => ({ prizes: state.prizes.filter((p) => p.id !== id) })),

      addSponsor: (sponsor) =>
        set((state) => ({ sponsors: [...state.sponsors, sponsor] })),
      removeSponsor: (id) =>
        set((state) => ({ sponsors: state.sponsors.filter((s) => s.id !== id) })),

      addCriteria: (criteria) =>
        set((state) => ({ judgingCriteria: [...state.judgingCriteria, criteria] })),
      removeCriteria: (id) =>
        set((state) => ({
          judgingCriteria: state.judgingCriteria.filter((c) => c.id !== id),
        })),

      addEligibility: (rule) =>
        set((state) => ({ eligibility: [...state.eligibility, rule] })),
      removeEligibility: (index) =>
        set((state) => ({
          eligibility: state.eligibility.filter((_, i) => i !== index),
        })),

      resetForm: () => set(initialState),
    }),
    {
      name: "hackathon-form-storage",
      version: 2,
      // Migrate any persisted drafts from the single-category era: carry the
      // old `category` string over as the first (and only) element of the
      // new `categories` array so in-progress work isn't silently dropped.
      migrate: (persistedState: unknown, fromVersion: number) => {
        if (fromVersion >= 2 || !persistedState || typeof persistedState !== "object") {
          return persistedState as Partial<HackathonFormState>;
        }
        const prior = persistedState as Record<string, unknown> & { category?: string };
        const legacyCategory = typeof prior.category === "string" ? prior.category.trim() : "";
        const { category: _drop, ...rest } = prior;
        void _drop;
        return {
          ...rest,
          categories: legacyCategory ? [legacyCategory] : [],
        } as Partial<HackathonFormState>;
      },
      partialize: (state) => {
        // Exclude large base64 image data from localStorage
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { coverImage, logo, ...rest } = state;
        return rest;
      },
    }
  )
);
