type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastListener = (msg: string, type: ToastType, duration?: number) => void;

let _listener: ToastListener | null = null;

const show = (msg: string, type: ToastType = 'info', duration?: number) => {
  if (_listener) {
    _listener(msg, type, duration);
  } else {
    console.warn('[toast]', type, msg);
  }
};

export const toast = {
  success: (msg: string, duration?: number) => show(msg, 'success', duration),
  error: (msg: string, duration?: number) => show(msg, 'error', duration),
  info: (msg: string, duration?: number) => show(msg, 'info', duration),
  warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
  _register: (fn: ToastListener) => { _listener = fn; },
};
