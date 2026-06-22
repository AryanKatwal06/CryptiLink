export enum MerchantState {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface MerchantDTO {
  id: string;
  name: string;
  state: MerchantState;
}
