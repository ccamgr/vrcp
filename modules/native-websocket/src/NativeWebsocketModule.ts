import { NativeModule, requireNativeModule } from 'expo';

import { NativeWebsocketModuleEvents } from './NativeWebsocket.types';

declare class NativeWebsocketModule extends NativeModule<NativeWebsocketModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<NativeWebsocketModule>('NativeWebsocket');
