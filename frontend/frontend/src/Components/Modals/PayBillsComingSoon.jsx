import React from "react";
import Lottie from "lottie-react";
import emptyAnim from "../../assets/empty.json";

const PayBillsComingSoon = ({ onClose }) => (
  <div 
    className="fixed inset-0 bg-slate-800/20 dark:bg-black/40 z-[2000] flex items-center justify-center backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pay-bills-title"
  >
    <div className="bg-white/90 dark:bg-slate-800/95 rounded-2xl shadow-2xl p-10 min-w-[340px] max-w-[420px] flex flex-col items-center relative border border-indigo-100 dark:border-slate-700 backdrop-blur-lg overflow-hidden">
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 border-none rounded-full w-9 h-9 font-bold text-xl cursor-pointer shadow-sm flex items-center justify-center transition-colors hover:bg-rose-500/20 dark:hover:bg-rose-500/30"
        aria-label="Close modal"
      >
        ×
      </button>
      <Lottie animationData={emptyAnim} style={{ width: 180, marginBottom: 12 }} loop={true} />
      <h2 id="pay-bills-title" className="font-extrabold text-2xl text-blue-600 dark:text-blue-400 mb-2 tracking-wide">Pay Bills</h2>
      <p className="text-slate-500 dark:text-slate-400 text-base text-center mb-5 font-medium">
        This feature will be available soon!<br />Stay tuned for seamless bill payments.
      </p>
      <button
        onClick={onClose}
        className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-none rounded-xl px-9 py-3 font-bold text-base mt-2 shadow-md cursor-pointer tracking-wide hover:from-indigo-600 hover:to-blue-700 transition-all"
      >
        Close
      </button>
    </div>
  </div>
);

export default PayBillsComingSoon;
