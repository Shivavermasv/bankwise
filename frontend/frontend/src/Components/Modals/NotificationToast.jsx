import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NotificationToast = ({ notifications, onMarkAsSeen, onClear }) => {
  const [visibleNotifications, setVisibleNotifications] = useState([]);

  useEffect(() => {
    // Show only unseen notifications as toasts
    const unseenNotifications = notifications.filter(n => !n.seen && !n.toastShown);
    setVisibleNotifications(unseenNotifications);

    // Auto-hide notifications after 5 seconds
    unseenNotifications.forEach(notif => {
      setTimeout(() => {
        handleDismiss(notif.id);
      }, 5000);
    });
  }, [notifications]);

  const handleDismiss = (notifId) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== notifId));
    if (onClear) {
      onClear(notifId);
    }
  };

  const handleMarkAsSeen = (notifId) => {
    onMarkAsSeen(notifId);
    handleDismiss(notifId);
  };

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      pointerEvents: "none"
    }}>
      <AnimatePresence>
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ 
              duration: 0.4, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 100 
            }}
            style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              minWidth: 320,
              maxWidth: 400,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              pointerEvents: "auto"
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 8
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: getNotificationColor(notification.type)
                }} />
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: getNotificationColor(notification.type),
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  {notification.type || "Notification"}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(notification.id)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 0,
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e293b",
              marginBottom: 4,
              lineHeight: 1.4
            }}>
              {notification.title || "New Notification"}
            </div>
            <div style={{
              fontSize: 13,
              color: "#64748b",
              marginBottom: 12,
              lineHeight: 1.4
            }}>
              {notification.message || notification.content || "You have a new notification"}
            </div>

            {/* Actions */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{
                fontSize: 11,
                color: "#94a3b8"
              }}>
                {formatTime(notification.timestamp || notification.createdAt)}
              </div>
              <button
                onClick={() => handleMarkAsSeen(notification.id)}
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(59,130,246,0.3)"
                }}
              >
                Mark as Read
              </button>
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 2,
                background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                borderRadius: "0 0 16px 16px"
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Helper functions
const getNotificationColor = (type) => {
  switch (type?.toLowerCase()) {
    case 'success':
    case 'deposit':
    case 'credit':
      return '#10b981';
    case 'warning':
    case 'pending':
      return '#f59e0b';
    case 'error':
    case 'failed':
    case 'debit':
      return '#ef4444';
    case 'info':
    case 'transfer':
      return '#3b82f6';
    default:
      return '#6366f1';
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short'
  });
};

export default NotificationToast;
