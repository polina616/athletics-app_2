import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Gender } from "@/lib/types";

export interface AthleteDefaults {
  teamId: string;
  ageGroup: string;
  gender: Gender;
}

interface AppState {
  currentMeetId: string | null;
  selectedEventKey: string | null;
  isAthleteModalOpen: boolean;
  isResultModalOpen: boolean;
  /** Последние выбранные команда/возраст/пол при регистрации спортсмена —
   *  отдельно по каждому соревнованию, т.к. судья обычно вносит несколько
   *  спортсменов подряд из одной команды/категории. */
  lastAthleteDefaults: Record<string, AthleteDefaults>;

  setCurrentMeetId: (id: string | null) => void;
  setSelectedEventKey: (key: string | null) => void;
  setAthleteModalOpen: (open: boolean) => void;
  setResultModalOpen: (open: boolean) => void;
  openResultModal: (eventKey: string) => void;
  setLastAthleteDefaults: (meetId: string, defaults: AthleteDefaults) => void;
  /** Вызывается после удаления соревнования — подчищает запомненные
   *  дефолты этого meetId и, на всякий случай, сбрасывает currentMeetId,
   *  если он почему-то указывал на уже удалённое соревнование. */
  clearMeetData: (meetId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentMeetId: null,
      selectedEventKey: null,
      isAthleteModalOpen: false,
      isResultModalOpen: false,
      lastAthleteDefaults: {},

      setCurrentMeetId: (id) => set({ currentMeetId: id }),
      setSelectedEventKey: (key) => set({ selectedEventKey: key }),
      setAthleteModalOpen: (open) => set({ isAthleteModalOpen: open }),
      setResultModalOpen: (open) => set({ isResultModalOpen: open }),

      openResultModal: (eventKey) => set({ selectedEventKey: eventKey, isResultModalOpen: true }),

      setLastAthleteDefaults: (meetId, defaults) =>
        set((state) => ({
          lastAthleteDefaults: { ...state.lastAthleteDefaults, [meetId]: defaults },
        })),

      clearMeetData: (meetId) =>
        set((state) => {
          const rest = { ...state.lastAthleteDefaults };
          delete rest[meetId];
          return {
            lastAthleteDefaults: rest,
            currentMeetId: state.currentMeetId === meetId ? null : state.currentMeetId,
          };
        }),
    }),
    {
      name: "athletics-app-storage",
      storage: createJSONStorage(() => localStorage),
      // Модалки не должны "переживать" перезагрузку страницы открытыми —
      // сохраняем в localStorage только то, к чему реально нужно вернуться.
      partialize: (state) => ({
        currentMeetId: state.currentMeetId,
        lastAthleteDefaults: state.lastAthleteDefaults,
      }),
    }
  )
);