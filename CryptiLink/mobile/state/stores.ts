import create from 'zustand';

type SessionState = {
  initialized: boolean;
  setInitialized: (v: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  initialized: false,
  setInitialized: (v) => set({ initialized: v }),
}));

type PreferencesState = {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  darkMode: true,
  setDarkMode: (v) => set({ darkMode: v }),
}));

type AuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));

type WalletState = {
  selectedWalletId: string | null;
  setSelectedWalletId: (walletId: string | null) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  selectedWalletId: null,
  setSelectedWalletId: (selectedWalletId) => set({ selectedWalletId }),
}));

type TransactionState = {
  pendingCount: number;
  setPendingCount: (pendingCount: number) => void;
};

export const useTransactionStore = create<TransactionState>((set) => ({
  pendingCount: 0,
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));

type OfflineQueueState = {
  queuedCount: number;
  setQueuedCount: (queuedCount: number) => void;
};

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  queuedCount: 0,
  setQueuedCount: (queuedCount) => set({ queuedCount }),
}));

type MerchantState = {
  merchantId: string | null;
  setMerchantId: (merchantId: string | null) => void;
};

export const useMerchantStore = create<MerchantState>((set) => ({
  merchantId: null,
  setMerchantId: (merchantId) => set({ merchantId }),
}));

type UiState = {
  activeModal: string | null;
  setActiveModal: (activeModal: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  setActiveModal: (activeModal) => set({ activeModal }),
}));

type NotificationState = {
  pushToken: string | null;
  setPushToken: (pushToken: string | null) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  pushToken: null,
  setPushToken: (pushToken) => set({ pushToken }),
}));

export default { useSessionStore, usePreferencesStore };
