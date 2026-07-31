import { create } from "zustand";

interface AppState {
  currentMeetId: string | null;
  selectedEventKey: string | null;
  isAthleteModalOpen: boolean;
  isResultModalOpen: boolean;

  setCurrentMeetId: (id: string | null) => void;
  setSelectedEventKey: (key: string | null) => void;
  setAthleteModalOpen: (open: boolean) => void;
  setResultModalOpen: (open: boolean) => void;
  openResultModal: (eventKey: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentMeetId: null,
  selectedEventKey: null,
  isAthleteModalOpen: false,
  isResultModalOpen: false,

  setCurrentMeetId: (id) => set({ currentMeetId: id }),
  setSelectedEventKey: (key) => set({ selectedEventKey: key }),
  setAthleteModalOpen: (open) => set({ isAthleteModalOpen: open }),
  setResultModalOpen: (open) => set({ isResultModalOpen: open }),

  openResultModal: (eventKey) => set({ selectedEventKey: eventKey, isResultModalOpen: true }),
}));