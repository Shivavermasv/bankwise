import { Client as StompClient } from '@stomp/stompjs';

let client = null;
let subscription = null;
let activeEmail = null;
let activeToken = null;
const listeners = new Set();

export function addNotificationListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function broadcast(note) {
  listeners.forEach((l) => {
    try { l(note); } catch { /* ignore */ }
  });
}

// Backwards compatible signature:
// - connectNotifications(email)
// - connectNotifications(email, token)
// - connectNotifications({ email, token })
export function connectNotifications(emailOrConfig, maybeToken) {
  const config =
    typeof emailOrConfig === 'string'
      ? { email: emailOrConfig, token: maybeToken }
      : (emailOrConfig || {});

  const email = config.email;
  const token = config.token;

  if (!email || !token) return;

  // No-op if already connected for same identity
  if (activeEmail === email && activeToken === token && client?.connected) return;
  activeEmail = email;
  activeToken = token;

  disconnectNotifications();

  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8091';
  const wsBase = base.replace(/^http/, 'ws');
  const brokerURL = `${wsBase}/ws?token=${encodeURIComponent(token)}`;

  client = new StompClient({
    brokerURL,
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 3000,
    onConnect: () => {
      const topic = `/topic/notifications/${email}`;
      subscription = client.subscribe(topic, (message) => {
        try {
          broadcast(JSON.parse(message.body));
        } catch {
          // ignore
        }
      });
    }
  });

  client.activate();
}

export function disconnectNotifications() {
  try { subscription?.unsubscribe(); } catch { /* ignore */ }
  subscription = null;

  try { client?.deactivate(); } catch { /* ignore */ }
  client = null;
}
