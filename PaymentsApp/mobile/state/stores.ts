import create from 'zustand'

type SessionState = {
  initialized: boolean
  setInitialized: (v:boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  initialized: false,
  setInitialized: (v) => set({initialized: v}),
}))

type PreferencesState = {
  darkMode: boolean
  setDarkMode: (v:boolean) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  darkMode: true,
  setDarkMode: (v) => set({darkMode: v}),
}))

export default {useSessionStore, usePreferencesStore}
