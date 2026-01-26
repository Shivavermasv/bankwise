import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PayBillsComingSoon from "../Modals/PayBillsComingSoon";

const actions = [
  { id: 'deposit', label: 'Deposit', icon: '💰', color: 'from-blue-600 to-indigo-600', action: 'deposit' },
  { id: 'transfer', label: 'Transfer', icon: '🔄', color: 'from-cyan-600 to-sky-600', action: 'transfer' },
  { id: 'bills', label: 'Pay Bills', icon: '🧾', color: 'from-amber-500 to-rose-500', action: 'bills' },
  { id: 'loan', label: 'Apply Loan', icon: '🏦', color: 'from-emerald-500 to-blue-600', action: 'loan' }
];

const QuickActions = ({ user }) => {
  const navigate = useNavigate();
  const [showPayBills, setShowPayBills] = useState(false);

  const handleAction = (a) => {
    switch (a) {
      case 'deposit':
        navigate('/deposit');
        break;
      case 'transfer':
        navigate('/transfer'); // placeholder route
        break;
      case 'bills':
        setShowPayBills(true);
        break;
      case 'loan':
        navigate('/loan-apply');
        break;
      default:
        break;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {actions.map(a => (
          <button
            key={a.id}
            onClick={() => handleAction(a.action)}
            className={`group relative overflow-hidden rounded-xl px-4 py-5 flex flex-col items-start justify-between shadow-sm border border-slate-200/70 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${a.color.split(' ')[0].replace('from-','')}`}
          >
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${a.color} rounded-xl`} />
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-lg">
              {a.icon}
            </div>
            <span className="relative mt-4 font-semibold text-sm text-slate-700 dark:text-slate-200 group-hover:text-white">{a.label}</span>
          </button>
        ))}
      </motion.div>
      {showPayBills && <PayBillsComingSoon onClose={() => setShowPayBills(false)} />}
    </>
  );
};

export default QuickActions;
