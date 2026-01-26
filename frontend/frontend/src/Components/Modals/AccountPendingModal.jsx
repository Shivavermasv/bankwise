import React, { useEffect, useRef } from "react";
import Lottie from "lottie-react";
import emptyAnim from "../../assets/empty.json";
import { FaExclamationTriangle } from "react-icons/fa";

const AccountPendingModal = ({ onVerify }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/50 z-[3000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-9 min-w-[320px] max-w-[400px] flex flex-col items-center relative">
        <Lottie animationData={emptyAnim} style={{ width: 180, marginBottom: 12 }} loop={true} />
        <div className="flex items-center gap-2 mb-2">
          <FaExclamationTriangle className="text-amber-500 text-xl" />
          <h2 id="pending-title" className="font-bold text-xl text-amber-500">
            Account Not Verified
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-base text-center mb-5">
          Your account is pending verification.<br />
          Please complete verification to access all features.
        </p>
        <button 
          ref={buttonRef}
          onClick={onVerify} 
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-7 py-2.5 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
        >
          Verify Now
        </button>
      </div>
    </div>
  );
};

export default AccountPendingModal;
