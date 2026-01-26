import React, { useState } from 'react';
import { createDepositRequest } from '../../services/accounts';
import { toDisplayString } from '../../utils';

const DepositRequestForm = ({ accountNumber, token, onCreated }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!amount || parseFloat(amount) <= 0) errors.amount = 'Enter a valid amount';
    if (!reference) errors.reference = 'Reference number is required';
    return errors;
  };

  const submit = async (e) => {
    e.preventDefault();
    setStatus(null); setError(null); setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      const resp = await createDepositRequest({
        token,
        accountNumber,
        amount: parseFloat(amount),
        reference
      });
      setStatus(typeof resp === 'string' ? resp : 'Created');
      onCreated && onCreated();
      setAmount(''); setReference('');
    } catch(e){ setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-lg border">
      <h3 className="font-semibold">Create Deposit Request</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <input
            className={`border p-2 rounded w-full ${fieldErrors.amount ? 'border-red-500' : ''}`}
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={e=>{ setAmount(e.target.value); setFieldErrors(prev => ({ ...prev, amount: undefined })); }}
          />
          {fieldErrors.amount && <div className="text-red-500 text-xs mt-1">{fieldErrors.amount}</div>}
        </div>
        <div>
          <input
            className={`border p-2 rounded w-full ${fieldErrors.reference ? 'border-red-500' : ''}`}
            placeholder="Reference Number"
            value={reference}
            onChange={e=>{ setReference(e.target.value); setFieldErrors(prev => ({ ...prev, reference: undefined })); }}
          />
          {fieldErrors.reference && <div className="text-red-500 text-xs mt-1">{fieldErrors.reference}</div>}
        </div>
      </div>
      <button disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">{loading? 'Submitting...' : 'Submit Deposit'}</button>
      {status && <div className="text-green-600 text-sm">{status}</div>}
      {error && <div className="text-red-500 text-sm">{toDisplayString(error)}</div>}
    </form>
  );
};

export default DepositRequestForm;
