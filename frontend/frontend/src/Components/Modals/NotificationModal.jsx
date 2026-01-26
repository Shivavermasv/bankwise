import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBell, FaTimes } from "react-icons/fa";

const NotificationModal = ({ show, notifications, markAsSeen, setShowNotifModal }) => {
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // Focus trap implementation
  useEffect(() => {
    if (show && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifModal(false);
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [show, setShowNotifModal]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[1000] flex items-center justify-center p-4"
          onClick={() => setShowNotifModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notification-title"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FaBell className="text-blue-500" />
                <h2 id="notification-title" className="font-bold text-lg text-slate-800 dark:text-white">
                  Notifications
                </h2>
              </div>
              <button
                ref={firstFocusableRef}
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Close notifications"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <FaBell className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        n.seen 
                          ? 'bg-slate-100 dark:bg-slate-700/50' 
                          : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      }`}
                      onClick={() => !n.seen && markAsSeen(n.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && !n.seen && markAsSeen(n.id)}
                      aria-label={n.seen ? "Notification read" : "Click to mark as read"}
                    >
                      <p className={`text-sm ${n.seen ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-white font-semibold'}`}>
                        {n.message || n.content || "New Notification"}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {n.timestamp ? new Date(n.timestamp).toLocaleString() : ""}
                        </span>
                        {!n.seen && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Mark as seen
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationModal;
