import React, { useState } from "react";
import { toDisplayString } from "../../utils";
import { submitKyc } from "../../services/accounts";

const isFileValid = (file) => {
  if (!file) return false;
  const validTypes = ["image/jpeg", "image/png", "application/pdf", "image/jpg"];
  return validTypes.includes(file.type) && file.size <= 500 * 1024;
};

const AccountVerificationModal = ({ user, onClose, onSuccess }) => {
  const [aadharNumber, setAadharNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [aadharDoc, setAadharDoc] = useState(null);
  const [panDoc, setPanDoc] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const isValidAadhar = (value) => /^\d{12}$/.test(value || '');
  const isValidPan = (value) => /^[A-Z]{5}\d{4}[A-Z]$/.test(value || '');

  const validate = () => {
    const errors = {};
    if (!aadharNumber) errors.aadharNumber = "Aadhar number is required";
    else if (!isValidAadhar(aadharNumber)) errors.aadharNumber = "Aadhar number must be 12 digits";
    if (!panNumber) errors.panNumber = "PAN number is required";
    else if (!isValidPan(panNumber)) errors.panNumber = "PAN must be in format ABCDE1234F";
    if (!address) errors.address = "Address is required";
    if (!aadharDoc) errors.aadharDoc = "Aadhar document is required";
    if (!panDoc) errors.panDoc = "PAN document is required";
    return errors;
  };

  const handleFile = (setter) => (e) => {
    const file = e.target.files[0];
    if (!isFileValid(file)) {
      setError("Only images or PDFs below 500KB are allowed.");
      setter(null);
      return;
    }
    setError("");
    setter(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    if (!user.token) {
      setError("Authentication token missing. Please login again.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("accountId", user.accountId || user.account_id || user.accountNumber);
      formData.append("aadharNumber", aadharNumber);
      formData.append("panNumber", panNumber);
      formData.append("address", address);
      formData.append("aadharDocument", aadharDoc);
      formData.append("panDocument", panDoc);
      await submitKyc({ token: user.token, formData });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[3100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
    >
      <form 
        onSubmit={handleSubmit} 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-9 min-w-[340px] max-w-[400px] flex flex-col items-center relative"
      >
        <h2 id="verification-title" className="font-bold text-xl text-blue-600 dark:text-blue-400 mb-2">Account Verification</h2>
        
        <input
          type="text"
          placeholder="Aadhar Number (12 digits)"
          value={aadharNumber}
          maxLength={12}
          inputMode="numeric"
          onChange={e => { setAadharNumber(e.target.value.replace(/\D/g, '')); setFieldErrors(prev => ({ ...prev, aadharNumber: undefined })); }}
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.aadharNumber ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100`}
          aria-label="Aadhar Number"
        />
        {fieldErrors.aadharNumber && <div className="text-red-400 text-xs mb-2 w-full">{fieldErrors.aadharNumber}</div>}
        
        <input
          type="text"
          placeholder="PAN Number (ABCDE1234F)"
          value={panNumber}
          maxLength={10}
          onChange={e => { setPanNumber(e.target.value.toUpperCase()); setFieldErrors(prev => ({ ...prev, panNumber: undefined })); }}
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.panNumber ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100`}
          aria-label="PAN Number"
        />
        {fieldErrors.panNumber && <div className="text-red-400 text-xs mb-2 w-full">{fieldErrors.panNumber}</div>}
        
        <input
          type="text"
          placeholder="Address"
          value={address}
          onChange={e => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: undefined })); }}
          className={`mb-1 w-full p-2.5 rounded-lg border ${fieldErrors.address ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100`}
          aria-label="Address"
        />
        {fieldErrors.address && <div className="text-red-400 text-xs mb-2 w-full">{fieldErrors.address}</div>}
        
        <label className="w-full mb-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
          Aadhar Document (PDF/Image, &lt;500KB)
          <input 
            type="file" 
            accept=".pdf,image/*" 
            onChange={(e) => { handleFile(setAadharDoc)(e); setFieldErrors(prev => ({ ...prev, aadharDoc: undefined })); }} 
            className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-700 dark:file:text-slate-200 hover:file:bg-blue-100 dark:hover:file:bg-slate-600"
            aria-label="Upload Aadhar Document"
          />
        </label>
        {fieldErrors.aadharDoc && <div className="text-red-400 text-xs mb-2 w-full">{fieldErrors.aadharDoc}</div>}
        
        <label className="w-full mb-2 text-slate-700 dark:text-slate-300 font-medium text-sm">
          PAN Document (PDF/Image, &lt;500KB)
          <input 
            type="file" 
            accept=".pdf,image/*" 
            onChange={(e) => { handleFile(setPanDoc)(e); setFieldErrors(prev => ({ ...prev, panDoc: undefined })); }} 
            className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-700 dark:file:text-slate-200 hover:file:bg-blue-100 dark:hover:file:bg-slate-600"
            aria-label="Upload PAN Document"
          />
        </label>
        {fieldErrors.panDoc && <div className="text-red-400 text-xs mb-2 w-full">{fieldErrors.panDoc}</div>}
        
        {error && <div className="text-red-500 dark:text-red-400 mb-2 text-sm">{toDisplayString(error)}</div>}
        
        <div className="flex gap-4 mt-2">
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-slate-500 hover:bg-slate-600 text-white border-none rounded-lg px-6 py-2.5 font-semibold text-base cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white border-none rounded-lg px-6 py-2.5 font-semibold text-base cursor-pointer transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountVerificationModal;
