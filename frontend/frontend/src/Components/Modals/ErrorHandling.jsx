import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaCheckCircle, FaExclamationTriangle, FaExclamationCircle, 
  FaInfoCircle, FaTimes 
} from 'react-icons/fa';

/**
 * Error/Success Toast Component
 * 
 * Usage:
 * const [toast, setToast] = useState(null);
 * 
 * // Show toast
 * setToast({ type: 'success', message: 'Operation successful!' });
 * setToast({ type: 'error', message: 'Something went wrong' });
 * setToast({ type: 'warning', message: 'Please review your input' });
 * setToast({ type: 'info', message: 'Tip: You can do this' });
 * 
 * // In JSX
 * <Toast toast={toast} onClose={() => setToast(null)} />
 */
const Toast = ({ toast, onClose, duration = 5000 }) => {
  React.useEffect(() => {
    if (toast && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, onClose]);

  const config = {
    success: {
      icon: FaCheckCircle,
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-800 dark:text-emerald-200'
    },
    error: {
      icon: FaExclamationCircle,
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-500',
      textColor: 'text-red-800 dark:text-red-200'
    },
    warning: {
      icon: FaExclamationTriangle,
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-800 dark:text-amber-200'
    },
    info: {
      icon: FaInfoCircle,
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-800 dark:text-blue-200'
    }
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 right-4 z-[100] max-w-md"
        >
          {(() => {
            const { icon: Icon, bg, border, iconColor, textColor } = config[toast.type] || config.info;
            return (
              <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg ${bg} border ${border} backdrop-blur-sm`}>
                <Icon className={`text-xl flex-shrink-0 mt-0.5 ${iconColor}`} />
                <div className="flex-1">
                  {toast.title && (
                    <p className={`font-semibold ${textColor}`}>{toast.title}</p>
                  )}
                  <p className={`text-sm ${textColor} ${toast.title ? 'opacity-80' : ''}`}>
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={`${textColor} hover:opacity-70 transition-opacity p-1`}
                >
                  <FaTimes />
                </button>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Animated Error Modal Component
 * 
 * Usage:
 * const [errorModal, setErrorModal] = useState(null);
 * 
 * setErrorModal({
 *   type: 'error', // 'error' | 'warning' | 'success' | 'info'
 *   title: 'Error Title',
 *   message: 'Error description here',
 *   actions: [
 *     { label: 'Try Again', onClick: () => retry(), primary: true },
 *     { label: 'Cancel', onClick: () => setErrorModal(null) }
 *   ]
 * });
 * 
 * <AnimatedModal modal={errorModal} onClose={() => setErrorModal(null)} />
 */
const AnimatedModal = ({ modal, onClose }) => {
  const config = {
    success: {
      icon: FaCheckCircle,
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-500'
    },
    error: {
      icon: FaExclamationCircle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: FaExclamationTriangle,
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-500'
    },
    info: {
      icon: FaInfoCircle,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-500'
    }
  };

  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const { icon: Icon, iconBg, iconColor } = config[modal.type] || config.info;
              return (
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                    className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${iconBg}`}
                  >
                    <Icon className={`text-3xl ${iconColor}`} />
                  </motion.div>
                  
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-xl font-bold text-slate-800 dark:text-white mb-2"
                  >
                    {modal.title}
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-600 dark:text-slate-300 mb-6"
                  >
                    {modal.message}
                  </motion.p>
                  
                  {modal.actions && modal.actions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="flex flex-col gap-2"
                    >
                      {modal.actions.map((action, idx) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={action.onClick}
                          className={`w-full px-6 py-3 font-semibold rounded-xl transition-colors ${
                            action.primary
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          {action.label}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                  
                  {(!modal.actions || modal.actions.length === 0) && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg"
                    >
                      Close
                    </motion.button>
                  )}
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook for managing error/success states
 */
export const useNotification = () => {
  const [toast, setToast] = React.useState(null);
  const [modal, setModal] = React.useState(null);

  const showToast = React.useCallback((type, message, title = null) => {
    setToast({ type, message, title });
  }, []);

  const showSuccess = React.useCallback((message, title = 'Success') => {
    showToast('success', message, title);
  }, [showToast]);

  const showError = React.useCallback((message, title = 'Error') => {
    showToast('error', message, title);
  }, [showToast]);

  const showWarning = React.useCallback((message, title = 'Warning') => {
    showToast('warning', message, title);
  }, [showToast]);

  const showInfo = React.useCallback((message, title = null) => {
    showToast('info', message, title);
  }, [showToast]);

  const showModal = React.useCallback((options) => {
    setModal(options);
  }, []);

  const closeToast = React.useCallback(() => setToast(null), []);
  const closeModal = React.useCallback(() => setModal(null), []);

  return {
    toast,
    modal,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showModal,
    closeToast,
    closeModal,
    // Render helpers
    ToastComponent: () => <Toast toast={toast} onClose={closeToast} />,
    ModalComponent: () => <AnimatedModal modal={modal} onClose={closeModal} />
  };
};

export { Toast, AnimatedModal };
export default Toast;
