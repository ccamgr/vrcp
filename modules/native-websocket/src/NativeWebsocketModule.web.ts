import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './NativeWebsocket.types';

type NativeWebsocketModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class NativeWebsocketModule extends NativeModule<NativeWebsocketModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(NativeWebsocketModule, 'NativeWebsocketModule');
