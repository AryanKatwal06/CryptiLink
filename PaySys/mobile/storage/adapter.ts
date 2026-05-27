export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export type SecureStorageAdapter = StorageAdapter;

export const createMMKVAdapter = (): StorageAdapter => ({
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
});
