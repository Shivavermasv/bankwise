import React, { useState } from 'react';
import { updateInterestRate } from '../../services/accounts';
import { toDisplayString } from '../../utils';

const InterestRateUpdateForm = ({ token }) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [rate, setRate] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!accountNumber) errors.accountNumber = 'Account number is required';
    if (!rate || Number(rate) <= 0) errors.rate = 'Rate must be greater than 0';
    return errors;
  };

  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setError(null); setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      await updateInterestRate({ token, accountNumber, newInterestRate: rate });
      setMsg('Interest rate updated');
    } catch(e){ setError(e.message||'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-2 bg-white dark:bg-slate-800 p-4 rounded-xl border">
      <h4 className="font-semibold text-sm">Modify Interest Rate</h4>
      <div>
        <input className={`border p-2 rounded w-full ${fieldErrors.accountNumber ? 'border-red-500' : ''}`} placeholder="Account Number" value={accountNumber} onChange={e=>{ setAccountNumber(e.target.value); setFieldErrors(prev => ({ ...prev, accountNumber: undefined })); }} />
        {fieldErrors.accountNumber && <div className="text-red-500 text-xs mt-1">{fieldErrors.accountNumber}</div>}
      </div>
      <div>
        <input className={`border p-2 rounded w-full ${fieldErrors.rate ? 'border-red-500' : ''}`} type="number" step="0.01" placeholder="New Rate (e.g. 0.08)" value={rate} onChange={e=>{ setRate(e.target.value); setFieldErrors(prev => ({ ...prev, rate: undefined })); }} />
        {fieldErrors.rate && <div className="text-red-500 text-xs mt-1">{fieldErrors.rate}</div>}
      </div>
      <button disabled={loading} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-50">{loading? 'Updating...' : 'Update Rate'}</button>
      {msg && <div className="text-green-600 text-xs">{toDisplayString(msg)}</div>}
      {error && <div className="text-red-500 text-xs">{toDisplayString(error)}</div>}
    </form>
  );
};

export default InterestRateUpdateForm;
