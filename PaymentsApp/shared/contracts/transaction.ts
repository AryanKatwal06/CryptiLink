export enum TransactionState {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface TransactionDTO {
  id: string;
  amount: number;
  currency: string;
  state: TransactionState;
  createdAt: string; // ISO
}
