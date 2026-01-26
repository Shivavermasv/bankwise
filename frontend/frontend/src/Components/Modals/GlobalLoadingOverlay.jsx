import React, { useEffect, useState } from 'react';
import { onGlobalLoadingChange } from '../../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

// Animated banking logo spinner
const BankingSpinner = () => (
  <div className="relative w-16 h-16">
    {/* Outer rotating ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-indigo-500 rounded-full"
    />
    {/* Inner pulsing circle */}
    <motion.div
      animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute inset-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center"
    >
      <span className="text-white text-lg font-bold">₹</span>
    </motion.div>
  </div>
);

const GlobalLoadingOverlay = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Processing...');

  useEffect(() => {
    const off = onGlobalLoadingChange((isLoading, loadingMessage) => {
      setLoading(isLoading);
      if (loadingMessage) setMessage(loadingMessage);
    });
    return off;
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-800 px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4"
          >
            <BankingSpinner />
            <p className="text-slate-700 dark:text-slate-200 font-medium">{message}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingOverlay;
