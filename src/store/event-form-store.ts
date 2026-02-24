import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  EventType,
  EventCategory,
  EntityVisibility,
  TicketType,
  Speaker,
  AgendaSession,
} from "@/lib/types";

interface EventFormState {
  currentStep: number;
  // Step 1: Basics
  title: string;
  tagline: string;
  description: string;
  coverImage: string;
  category: EventCategory | "";
  tags: string[];
  // Step 2: Date & Location
  startDate: string;
  endDate: string;
  timezone: string;
  locationType: EventType;
  address: string;
  city: string;
  country: string;
  platform: string;
  meetingUrl: string;
  // Step 3: Tickets
  tickets: TicketType[];
  // Step 4: Additional
  speakers: Speaker[];
  agenda: AgendaSession[];
  faq: { question: string; answer: string }[];
  // Visibility
  visibility: EntityVisibility;

  // Actions
  setStep: (step: number) => void;
  updateField: <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void;
  addTicket: (ticket: TicketType) => void;
  removeTicket: (id: string) => void;
  addSpeaker: (speaker: Speaker) => void;
  removeSpeaker: (id: string) => void;
  addSession: (session: AgendaSession) => void;
  removeSession: (id: string) => void;
  addFaq: (faq: { question: string; answer: string }) => void;
  removeFaq: (index: number) => void;
  resetForm: () => void;
}

const initialState = {
  currentStep: 0,
  title: "",
  tagline: "",
  description: "",
  coverImage: "",
  category: "" as const,
  tags: [],
  startDate: "",
  endDate: "",
  timezone: "America/Los_Angeles",
  locationType: "in-person" as EventType,
  address: "",
  city: "",
  country: "",
  platform: "",
  meetingUrl: "",
  tickets: [],
  speakers: [],
  agenda: [],
  faq: [],
  visibility: "public" as EntityVisibility,
};

export const useEventFormStore = create<EventFormState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ currentStep: step }),

      updateField: (key, value) => set({ [key]: value }),

      addTicket: (ticket) =>
        set((state) => ({ tickets: [...state.tickets, ticket] })),
      removeTicket: (id) =>
        set((state) => ({ tickets: state.tickets.filter((t) => t.id !== id) })),

      addSpeaker: (speaker) =>
        set((state) => ({ speakers: [...state.speakers, speaker] })),
      removeSpeaker: (id) =>
        set((state) => ({ speakers: state.speakers.filter((s) => s.id !== id) })),

      addSession: (session) =>
        set((state) => ({ agenda: [...state.agenda, session] })),
      removeSession: (id) =>
        set((state) => ({ agenda: state.agenda.filter((s) => s.id !== id) })),

      addFaq: (faq) =>
        set((state) => ({ faq: [...state.faq, faq] })),
      removeFaq: (index) =>
        set((state) => ({ faq: state.faq.filter((_, i) => i !== index) })),

      resetForm: () => set(initialState),
    }),
    {
      name: "event-form-storage",
      partialize: (state) => {
        // Exclude large base64 image data from localStorage
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { coverImage, ...rest } = state;
        return rest;
      },
    }
  )
);
