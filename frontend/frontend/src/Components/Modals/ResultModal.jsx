import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaTimesCircle, FaInfoCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import Lottie from 'lottie-react';

// Success animation data (simple checkmark)
const successAnimationData = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 200,
  "h": 200,
  "layers": [{
    "ty": 4,
    "nm": "Check",
    "sr": 1,
    "ks": {
      "o": { "a": 0, "k": 100 },
      "p": { "a": 0, "k": [100, 100, 0] },
      "a": { "a": 0, "k": [0, 0, 0] },
      "s": { "a": 1, "k": [{ "t": 0, "s": [0, 0, 100] }, { "t": 30, "s": [100, 100, 100] }] }
    },
    "shapes": [{
      "ty": "gr",
      "it": [{
        "ty": "sh",
        "ks": {
          "a": 0,
          "k": { "c": false, "v": [[-30, 0], [-10, 20], [30, -20]] }
        }
      }, {
        "ty": "st",
        "c": { "a": 0, "k": [0.2, 0.8, 0.4, 1] },
        "o": { "a": 0, "k": 100 },
        "w": { "a": 0, "k": 12 },
        "lc": 2,
        "lj": 2
      }, {
        "ty": "tr",
        "p": { "a": 0, "k": [0, 0] },
        "a": { "a": 0, "k": [0, 0] },
        "s": { "a": 0, "k": [100, 100] },
        "r": { "a": 0, "k": 0 },
        "o": { "a": 0, "k": 100 }
      }]
    }]
  }, {
    "ty": 4,
    "nm": "Circle",
    "sr": 1,
    "ks": {
      "o": { "a": 0, "k": 100 },
      "p": { "a": 0, "k": [100, 100, 0] },
      "a": { "a": 0, "k": [0, 0, 0] },
      "s": { "a": 1, "k": [{ "t": 0, "s": [0, 0, 100] }, { "t": 20, "s": [100, 100, 100] }] }
    },
    "shapes": [{
      "ty": "el",
      "p": { "a": 0, "k": [0, 0] },
      "s": { "a": 0, "k": [120, 120] }
    }, {
      "ty": "st",
      "c": { "a": 0, "k": [0.2, 0.8, 0.4, 1] },
      "o": { "a": 0, "k": 100 },
      "w": { "a": 0, "k": 6 }
    }, {
      "ty": "tr",
      "p": { "a": 0, "k": [0, 0] },
      "a": { "a": 0, "k": [0, 0] },
      "s": { "a": 0, "k": [100, 100] },
      "r": { "a": 0, "k": 0 },
      "o": { "a": 0, "k": 100 }
    }]
  }]
};

const ResultModal = ({ 
  isOpen, 
  onClose, 
  type = 'success', // success | error | info | warning
  title,
  message,
  details = null, // Object with key-value pairs to display
  actionLabel = 'Done',
  onAction = null,
  showAnimation = true
}) => {
  const config = {
    success: {
      icon: FaCheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700'
    },
    error: {
      icon: FaTimesCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      buttonBg: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      icon: FaInfoCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700'
    },
    warning: {
      icon: FaExclamationTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      buttonBg: 'bg-amber-600 hover:bg-amber-700'
    }
  };

  const { icon: Icon, color, bgColor, borderColor, buttonBg } = config[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border ${borderColor} overflow-hidden`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <FaTimes />
            </button>

            <div className="p-6 text-center">
              {/* Animation or Icon */}
              <div className={`mx-auto w-24 h-24 flex items-center justify-center rounded-full ${bgColor} mb-4`}>
                {showAnimation && type === 'success' ? (
                  <Lottie 
                    animationData={successAnimationData} 
                    loop={false} 
                    style={{ width: 80, height: 80 }}
                  />
                ) : (
                  <Icon className={`text-5xl ${color}`} />
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {title}
              </h3>

              {/* Message */}
              {message && (
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  {message}
                </p>
              )}

              {/* Details */}
              {details && (
                <div className={`mt-4 p-4 rounded-xl ${bgColor} text-left space-y-2`}>
                  {Object.entries(details).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{key}</span>
                      <span className="font-medium text-slate-800 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action button */}
              <button
                onClick={onAction || onClose}
                className={`mt-6 w-full py-3 px-6 rounded-xl text-white font-semibold ${buttonBg} transition-colors`}
              >
                {actionLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Transfer Success Modal - specialized for transfers
export const TransferSuccessModal = ({ isOpen, onClose, details }) => (
  <ResultModal
    isOpen={isOpen}
    onClose={onClose}
    type="success"
    title="Transfer Successful! 🎉"
    message="Your money has been sent securely."
    details={details ? {
      'Transaction ID': details.transactionId,
      'From Account': details.fromAccount,
      'To Account': details.toAccount,
      'Amount': `₹${details.amount?.toLocaleString()}`,
      'Date & Time': details.timestamp
    } : null}
    actionLabel="Done"
  />
);

// Generic Error Modal
export const ErrorModal = ({ isOpen, onClose, title = 'Something went wrong', message }) => (
  <ResultModal
    isOpen={isOpen}
    onClose={onClose}
    type="error"
    title={title}
    message={message}
    actionLabel="Try Again"
    showAnimation={false}
  />
);

// Deposit Success Modal
export const DepositSuccessModal = ({ isOpen, onClose, details }) => (
  <ResultModal
    isOpen={isOpen}
    onClose={onClose}
    type="success"
    title="Deposit Request Submitted! 📝"
    message="Your deposit request has been sent for approval."
    details={details ? {
      'Reference': details.reference,
      'Amount': `₹${details.amount?.toLocaleString()}`,
      'Status': 'Pending Approval'
    } : null}
    actionLabel="Got it"
  />
);

export default ResultModal;
