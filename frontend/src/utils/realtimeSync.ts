export const ZEN_DATA_CHANGED_EVENT = 'zen:data-changed';
const CHANNEL_NAME = 'zen-spa-data-sync';

type DataChangeDetail = {
  method?: string;
  url?: string;
  at: number;
};

const getChannel = () => {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  return new BroadcastChannel(CHANNEL_NAME);
};

export const notifyDataChanged = (detail: Partial<DataChangeDetail> = {}) => {
  if (typeof window === 'undefined') return;
  const payload: DataChangeDetail = { ...detail, at: Date.now() };
  window.dispatchEvent(new CustomEvent(ZEN_DATA_CHANGED_EVENT, { detail: payload }));

  const channel = getChannel();
  if (channel) {
    channel.postMessage(payload);
    channel.close();
  }
};

export const subscribeToDataChanges = (handler: (detail?: DataChangeDetail) => void) => {
  if (typeof window === 'undefined') return () => {};

  const onLocalChange = (event: Event) => {
    handler((event as CustomEvent<DataChangeDetail>).detail);
  };
  window.addEventListener(ZEN_DATA_CHANGED_EVENT, onLocalChange);

  const channel = getChannel();
  const onChannelMessage = (event: MessageEvent<DataChangeDetail>) => handler(event.data);
  if (channel) channel.addEventListener('message', onChannelMessage);

  return () => {
    window.removeEventListener(ZEN_DATA_CHANGED_EVENT, onLocalChange);
    if (channel) {
      channel.removeEventListener('message', onChannelMessage);
      channel.close();
    }
  };
};
