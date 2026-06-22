import { NativeModules } from 'react-native';
const { AcousticReceiverModule, SmsReceiverModule } = NativeModules;
export default {
  startAcousticTransmission: (payload: any) => {},
  startSmsTransmission: (payload: any, phone: string) => {},
  AcousticReceiverModule,
  SmsReceiverModule,
};
