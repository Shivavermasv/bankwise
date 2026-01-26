import { useEffect, useRef } from 'react';
import { connectNotifications, addNotificationListener } from '../utils/notifications';

export function useNotifications(email, token, { onNotification } = {}) {
  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!email || !token) return;
    connectNotifications({ email, token });
    const off = addNotificationListener(note => {
      if (callbackRef.current) callbackRef.current(note);
    });
    return off;
  }, [email, token]);
}
