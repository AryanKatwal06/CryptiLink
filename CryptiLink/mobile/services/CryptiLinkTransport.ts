import { NativeModules } from 'react-native';
const { AcousticReceiverModule, SmsReceiverModule } = NativeModules;
export default {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  startAcousticTransmission: (payload: unknown) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  startSmsTransmission: (payload: unknown, phone: string) => {},
  AcousticReceiverModule,
  SmsReceiverModule,
};
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const sendPayload = (channel: string, payload: unknown) => {};
export const subscribeToChannelEvents = (callback: (event: { channel: string, status: "idle" | "attempting" | "success" | "failed" }) => void) => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return () => {};
};
