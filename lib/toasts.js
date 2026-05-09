// Minimal pub/sub toast bus — no React dependency, usable from anywhere.
let _toasts   = [];
let _listeners = [];
let _nextId    = 1;

export function addToast({ icon, title, message, duration = 4000, type = "info" }) {
  const id = _nextId++;
  _toasts = [{ id, icon, title, message, type, duration }, ..._toasts].slice(0, 5);
  _listeners.forEach((cb) => cb(_toasts));
  setTimeout(() => removeToast(id), duration);
}

export function removeToast(id) {
  _toasts = _toasts.filter((t) => t.id !== id);
  _listeners.forEach((cb) => cb(_toasts));
}

export function subscribeToasts(cb) {
  _listeners.push(cb);
  return () => { _listeners = _listeners.filter((l) => l !== cb); };
}

export function getToasts() { return _toasts; }
