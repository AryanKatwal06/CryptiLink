import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  generateKeyPair(): Promise<string>;
  getPublicKeyBase64(): Promise<string>;
  signPayload(payloadBase64: string): Promise<string>;
  hasExistingKey(): Promise<boolean>;
  getKeySecurityLevel(): Promise<string>;
  getKeystoreInfo(): Promise<Record<string, string>>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CryptiLinkKey');