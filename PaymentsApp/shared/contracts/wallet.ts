export enum WalletState {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export interface WalletDTO {
  id: string;
  balance: number;
  currency: string;
  state: WalletState;
}
