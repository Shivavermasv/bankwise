import React from "react";
import { motion } from "framer-motion";

const insights = [
  { title: 'Security Tip', text: 'Never share your OTP, PIN or password with anyone. Bankwise will never ask for it.' },
  { title: 'Pro Tip', text: 'Use the PDF export in Transactions page to get statements delivered directly to your email.' },
  { title: 'Smart Saving', text: 'Set aside a fixed amount to deposit weekly. Consistency grows balances.' }
];

const TransactionsSection = () => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-md p-6 flex flex-col gap-4"
  >
    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Helpful Insights</h3>
    <ul className="space-y-4">
      {insights.map(i => (
        <li key={i.title} className="group relative p-4 rounded-xl bg-slate-50/70 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-600/50 hover:bg-white hover:shadow-sm transition-colors">
          <p className="font-medium text-sm text-slate-700 dark:text-slate-200 mb-1">{i.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{i.text}</p>
        </li>
      ))}
    </ul>
    <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">More analytics coming soon…</div>
  </motion.div>
);

export default TransactionsSection;
