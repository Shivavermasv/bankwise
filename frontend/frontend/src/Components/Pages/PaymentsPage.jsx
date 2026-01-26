import React from 'react';
import { Navbar } from '../Layout';
import { useTheme } from '../../context/ThemeContext.jsx';

const PaymentsPage = () => {
  const { theme } = useTheme();
  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-md p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white mb-2">Pay Bills</h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm">Manage utility payments with quick actions, biller templates, and due reminders.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Quick Pay</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Biller</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40" placeholder="Electricity Board" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Consumer ID</label>
                  <input className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40" placeholder="e.g. 4589-3321" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Amount</label>
                  <input type="number" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40" placeholder="₹" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Due Date</label>
                  <input type="date" className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40" />
                </div>
              </div>
              <button className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500">Pay Now</button>
            </div>

            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Upcoming Bills</h2>
              <div className="space-y-3">
                {[
                  { name: "Electricity - BESCOM", due: "Jan 30", amount: "₹1,320" },
                  { name: "Mobile Postpaid - Jio", due: "Feb 02", amount: "₹799" },
                  { name: "Water - BWSSB", due: "Feb 05", amount: "₹480" }
                ].map((bill) => (
                  <div key={bill.name} className="flex items-center justify-between rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 p-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{bill.name}</div>
                      <div className="text-xs text-slate-500">Due {bill.due}</div>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-white">{bill.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Popular Billers</h2>
              <div className="grid grid-cols-2 gap-3">
                {["Electricity", "Mobile", "Gas", "Water", "DTH", "Internet"].map((label) => (
                  <div key={label} className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 p-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="text-lg">💡</div>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Recent Payments</h2>
              <ul className="space-y-3 text-sm">
                {[
                  { name: "Airtel Fiber", date: "Jan 22", amount: "₹999" },
                  { name: "HP Gas", date: "Jan 18", amount: "₹1,040" },
                  { name: "Electricity", date: "Jan 15", amount: "₹1,280" }
                ].map((pay) => (
                  <li key={pay.name} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{pay.name}</span>
                    <span className="text-xs text-slate-500">{pay.date}</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{pay.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PaymentsPage;
