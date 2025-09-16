// Reexport the native module. On web, it will be resolved to NativeWebsocketModule.web.ts
// and on native platforms to NativeWebsocketModule.ts
export * from './src/NativeWebsocket.types';
export { default } from './src/NativeWebsocketModule';

