import { NativeModules } from 'react-native';
const { AcousticReceiverModule, SmsReceiverModule } = NativeModules;
export default {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  startAcousticTransmission: (payload: any) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  startSmsTransmission: (payload: any, phone: string) => {},
  AcousticReceiverModule,
  SmsReceiverModule,
};
