import React, { useState } from 'react';
import { submitKyc } from '../../services/accounts';
import { toDisplayString } from '../../utils';

const KycUploadForm = ({ accountNumber, token, onSuccess }) => {
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isValidAadhar = (value) => /^\d{12}$/.test(value || '');
  const isValidPan = (value) => /^[A-Z]{5}\d{4}[A-Z]$/.test(value || '');

  const validate = () => {
    const errors = {};
    if (!aadharNumber) errors.aadharNumber = 'Aadhar number is required';
    else if (!isValidAadhar(aadharNumber)) errors.aadharNumber = 'Aadhar number must be 12 digits';
    if (!panNumber) errors.panNumber = 'PAN number is required';
    else if (!isValidPan(panNumber)) errors.panNumber = 'PAN must be in format ABCDE1234F';
    if (!address) errors.address = 'Address is required';
    if (!aadharFile) errors.aadharFile = 'Aadhar document is required';
    if (!panFile) errors.panFile = 'PAN document is required';
    return errors;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setStatus(null); setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    const fd = new FormData();
    fd.append('accountId', accountNumber);
    fd.append('aadharNumber', aadharNumber);
    fd.append('panNumber', panNumber);
    fd.append('address', address);
    fd.append('aadharDocument', aadharFile);
    fd.append('panDocument', panFile);
    setLoading(true);
    try {
      // Expect PDF bytes; we only treat 200 as success
      await submitKyc({ token, formData: fd });
      setStatus('KYC submitted and PDF generated');
      onSuccess && onSuccess();
    } catch(e){ setError(e.message || 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-lg border">
      <h3 className="font-semibold">KYC Submission</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <input
            className={`border p-2 rounded w-full ${fieldErrors.aadharNumber ? 'border-red-500' : ''}`}
            placeholder="Aadhar Number (12 digits)"
            value={aadharNumber}
            inputMode="numeric"
            maxLength={12}
            onChange={e=>{
              const v = e.target.value.replace(/\D/g, '');
              setAadharNumber(v);
              setFieldErrors(prev => ({ ...prev, aadharNumber: undefined }));
            }}
          />
          {fieldErrors.aadharNumber && <div className="text-red-500 text-xs mt-1">{fieldErrors.aadharNumber}</div>}
        </div>
        <div>
          <input
            className={`border p-2 rounded w-full ${fieldErrors.panNumber ? 'border-red-500' : ''}`}
            placeholder="PAN (ABCDE1234F)"
            value={panNumber}
            maxLength={10}
            onChange={e=>{
              const v = e.target.value.toUpperCase();
              setPanNumber(v);
              setFieldErrors(prev => ({ ...prev, panNumber: undefined }));
            }}
          />
          {fieldErrors.panNumber && <div className="text-red-500 text-xs mt-1">{fieldErrors.panNumber}</div>}
        </div>
        <div className="md:col-span-2">
          <input
            className={`border p-2 rounded w-full ${fieldErrors.address ? 'border-red-500' : ''}`}
            placeholder="Address"
            value={address}
            onChange={e=>{ setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: undefined })); }}
          />
          {fieldErrors.address && <div className="text-red-500 text-xs mt-1">{fieldErrors.address}</div>}
        </div>
        <div>
          <input type="file" accept="image/*,application/pdf" onChange={e=>{ setAadharFile(e.target.files[0]); setFieldErrors(prev => ({ ...prev, aadharFile: undefined })); }} />
          {fieldErrors.aadharFile && <div className="text-red-500 text-xs mt-1">{fieldErrors.aadharFile}</div>}
        </div>
        <div>
          <input type="file" accept="image/*,application/pdf" onChange={e=>{ setPanFile(e.target.files[0]); setFieldErrors(prev => ({ ...prev, panFile: undefined })); }} />
          {fieldErrors.panFile && <div className="text-red-500 text-xs mt-1">{fieldErrors.panFile}</div>}
        </div>
      </div>
      <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading? 'Submitting...' : 'Submit KYC'}</button>
      {status && <div className="text-green-600 text-sm">{status}</div>}
      {error && <div className="text-red-500 text-sm">{toDisplayString(error)}</div>}
    </form>
  );
};

export default KycUploadForm;
