import { contextBridge, ipcRenderer } from 'electron';

const sendCounterPayload = (payload: unknown) => {
  ipcRenderer.sendToHost('radar-counter', payload);
};

contextBridge.exposeInMainWorld('radarBridge', {
  publishCounter: sendCounterPayload
});

window.addEventListener('message', (event: MessageEvent) => {
  sendCounterPayload(event.data);
});
