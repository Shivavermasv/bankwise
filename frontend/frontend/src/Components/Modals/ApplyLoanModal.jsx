import React, { useState } from "react";
import { toDisplayString } from "../../utils";
import { applyForLoan } from "../../services/loans";

const interestRates = {
  SAVINGS: 10, // percent per annum
  CURRENT: 12
};

function calculateEMI(amount, rate, months) {
  const monthlyRate = rate / 12 / 100;
  return (
    (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

const ApplyLoanModal = ({ user, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(0);
  const [tenure, setTenure] = useState(12);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSchedule, setShowSchedule] = useState(false);

  const accountType = user.accountType || user.account_type || "SAVINGS";
  const interestRate = interestRates[accountType.toUpperCase()] || 10;
  const emi = amount && tenure ? calculateEMI(amount, interestRate, tenure) : 0;
  const totalPayable = emi * tenure;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errors = {};
    if (!amount || Number(amount) <= 0) errors.amount = "Amount is required";
    if (!tenure || Number(tenure) < 6) errors.tenure = "Tenure must be at least 6 months";
    if (!reason) errors.reason = "Reason is required";
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    if (!user.token) {
      setError("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      await applyForLoan({
        token: user.token,
        payload: {
          accountNumber: user.accountNumber,
          amount: Number(amount),
          tenureInMonths: Number(tenure),
          interestRate,
          reason
        }
      });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[2000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-loan-title"
    >
      <form 
        onSubmit={handleSubmit} 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-9 min-w-[340px] max-w-[400px] flex flex-col items-center relative"
      >
        <h2 id="apply-loan-title" className="font-bold text-xl text-blue-600 dark:text-blue-400 mb-2">Apply for Loan</h2>
        <div className="text-slate-500 dark:text-slate-400 text-sm mb-5">Interest Rate: <b>{interestRate}% p.a.</b></div>
        
        <input 
          type="number" 
          min={1000} 
          placeholder="Amount" 
          value={amount} 
          onChange={e => { setAmount(e.target.value); setFieldErrors(prev => ({ ...prev, amount: undefined })); }} 
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.amount ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-label="Loan amount"
        />
        {fieldErrors.amount && <div className="text-red-400 text-xs mb-2">{fieldErrors.amount}</div>}
        
        <input 
          type="number" 
          min={6} 
          max={120} 
          placeholder="Tenure (months)" 
          value={tenure} 
          onChange={e => { setTenure(e.target.value); setFieldErrors(prev => ({ ...prev, tenure: undefined })); }} 
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.tenure ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-label="Tenure in months"
        />
        {fieldErrors.tenure && <div className="text-red-400 text-xs mb-2">{fieldErrors.tenure}</div>}
        
        <input 
          type="text" 
          placeholder="Reason" 
          value={reason} 
          onChange={e => { setReason(e.target.value); setFieldErrors(prev => ({ ...prev, reason: undefined })); }} 
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.reason ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          aria-label="Loan reason"
        />
        {fieldErrors.reason && <div className="text-red-400 text-xs mb-2">{fieldErrors.reason}</div>}
        
        {emi > 0 && (
          <div className="mb-2.5 text-emerald-600 dark:text-emerald-400 font-semibold text-center">
            EMI: ₹{emi.toFixed(2)} / month<br />
            Total Payable: ₹{totalPayable.toFixed(2)}
            <span 
              className="text-slate-500 dark:text-slate-400 font-normal text-sm block mt-1 cursor-pointer hover:underline" 
              onClick={() => setShowSchedule(s => !s)}
            >
              {showSchedule ? 'Hide' : 'Show'} Repayment Schedule
            </span>
          </div>
        )}
        
        {showSchedule && emi > 0 && (
          <div className="max-h-[120px] overflow-y-auto mb-2.5 w-full">
            <table className="w-full text-sm text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700">
                  <th className="p-1">Month</th>
                  <th className="p-1">EMI</th>
                  <th className="p-1">Balance</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Number(tenure) }).map((_, i) => {
                  const bal = totalPayable - emi * (i + 1);
                  return (
                    <tr key={i} className="border-b border-slate-200 dark:border-slate-600">
                      <td className="p-1 text-center">{i + 1}</td>
                      <td className="p-1 text-center">₹{emi.toFixed(2)}</td>
                      <td className="p-1 text-center">₹{bal > 0 ? bal.toFixed(2) : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {error && <div className="text-red-500 dark:text-red-400 mb-2 text-sm">{toDisplayString(error)}</div>}
        
        <div className="flex gap-4 mt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-slate-500 hover:bg-slate-600 text-white border-none rounded-lg px-6 py-2.5 font-semibold text-base cursor-pointer transition-colors"
            aria-label="Cancel loan application"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white border-none rounded-lg px-6 py-2.5 font-semibold text-base cursor-pointer transition-colors"
          >
            {loading ? 'Applying...' : 'Apply'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ApplyLoanModal;
