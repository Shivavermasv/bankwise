import React, { useMemo, useState } from 'react';
import Navbar from '../Layout/Navbar';
import { motion } from 'framer-motion';
import { transferFunds } from '../../services/transactions';
import { searchRecipients } from '../../services/accounts';
import { useTheme } from '../../context/ThemeContext.jsx';
import { toDisplayString } from '../../utils';
import { FaCopy, FaCheck, FaBolt, FaShieldAlt, FaExchangeAlt, FaUserCircle } from 'react-icons/fa';
import { TransferSuccessModal } from '../Modals/ResultModal';

// Default avatar for recipients
const RecipientAvatar = ({ profilePhoto, profilePhotoContentType, name, size = 40 }) => {
  if (profilePhoto && profilePhotoContentType) {
    return (
      <img 
        src={`data:${profilePhotoContentType};base64,${profilePhoto}`}
        alt={name}
        className="rounded-full object-cover border-2 border-white dark:border-slate-600"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div 
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
      style={{ width: size, height: size }}
    >
      <FaUserCircle size={size * 0.6} />
    </div>
  );
};

const TransferPage = () => {
  const user = JSON.parse(sessionStorage.getItem('user')||'{}');
  const token = user.token;
  const { theme } = useTheme();
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [search, setSearch] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchCache] = useState(() => new Map());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transferDetails, setTransferDetails] = useState(null);

  const valid = toAccount && amount && parseFloat(amount) > 0 && toAccount !== user.accountNumber;

  const validate = () => {
    const errors = {};
    if (!toAccount) errors.toAccount = 'Destination account is required';
    if (toAccount === user.accountNumber) errors.toAccount = 'Cannot transfer to your own account';
    if (!amount || parseFloat(amount) <= 0) errors.amount = 'Amount must be greater than 0';
    return errors;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setLoading(true); setError(null); setStatus(null);
    try{
      const resp = await transferFunds({
        token,
        fromAccount: user.accountNumber,
        toAccount,
        amount: parseFloat(amount)
      });
      const resultStatus = typeof resp === 'string' ? resp : 'SUCCESS';
      setStatus(resultStatus);
      if (resultStatus === 'SUCCESS') {
        // Show success modal with transfer details
        setTransferDetails({
          fromAccount: user.accountNumber,
          toAccount,
          amount: parseFloat(amount),
          timestamp: new Date().toLocaleString(),
          transactionId: `TXN${Date.now()}`
        });
        setShowSuccessModal(true);
        // Reset form
        setToAccount('');
        setAmount('');
      }
    } catch(e){
      setError(e.message || 'Transfer failed');
    } finally { setLoading(false); }
  };

  const filteredPeople = useMemo(() => {
    if (!search.trim()) return searchResults.filter(p => p.accountNumber !== user.accountNumber);
    return searchResults.filter(p => p.accountNumber !== user.accountNumber);
  }, [search, searchResults, user.accountNumber]);

  React.useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return;
    }

    if (searchCache.has(q)) {
      setSearchResults(searchCache.get(q));
      setSearchError('');
      return;
    }

    let active = true;
    setSearchLoading(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        const data = await searchRecipients({ token, query: q });
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setSearchResults(list);
        searchCache.set(q, list);
      } catch (e) {
        if (!active) return;
        setSearchError(e?.message || 'Failed to search recipients');
        setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, token, searchCache]);

  const copyAccount = async (account) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(account);
      } else {
        const temp = document.createElement('textarea');
        temp.value = account;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopiedAccount(account);
      setTimeout(() => setCopiedAccount(null), 1200);
    } catch {
      setCopiedAccount(null);
    }
  };

  const heroImage = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#38bdf8'/>
          <stop offset='100%' stop-color='#6366f1'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' rx='18' fill='url(#g)'/>
      <circle cx='70' cy='70' r='26' fill='#ffffff33'/>
      <circle cx='300' cy='150' r='34' fill='#ffffff22'/>
      <text x='50%' y='55%' font-size='20' text-anchor='middle' fill='white' font-family='Arial'>Fast Transfers</text>
      <text x='50%' y='70%' font-size='12' text-anchor='middle' fill='#e0f2fe' font-family='Arial'>Secure • Instant • Reliable</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#f0fdfa_0%,#e0e7ff_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.form onSubmit={submit} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold">Transfer Funds</h2>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300">From Account</label>
              <input disabled value={user.accountNumber||''} className="w-full mt-1 p-2 rounded border bg-slate-100 dark:bg-slate-700" />
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300">To Account</label>
              <input
                value={toAccount}
                onChange={e=>{ setToAccount(e.target.value); setFieldErrors(prev => ({ ...prev, toAccount: undefined })); }}
                className={`w-full mt-1 p-2 rounded border ${fieldErrors.toAccount ? 'border-red-500' : ''}`}
                placeholder="Destination account number"
                inputMode="numeric"
              />
              {fieldErrors.toAccount && <div className="text-red-500 text-xs mt-1">{fieldErrors.toAccount}</div>}
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-slate-300">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e=>{ setAmount(e.target.value); setFieldErrors(prev => ({ ...prev, amount: undefined })); }}
                className={`w-full mt-1 p-2 rounded border ${fieldErrors.amount ? 'border-red-500' : ''}`}
              />
              {fieldErrors.amount && <div className="text-red-500 text-xs mt-1">{fieldErrors.amount}</div>}
            </div>
            <button disabled={!valid||loading} className="w-full py-2 rounded bg-blue-600 disabled:opacity-50 text-white font-medium">{loading? 'Processing...' : 'Transfer'}</button>
            {status && <div className="text-green-600 text-sm">Result: {status}</div>}
            {error && <div className="text-red-500 text-sm">{toDisplayString(error)}</div>}
          </motion.form>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 text-xl"><FaBolt /></span>
              <div>
                <div className="font-semibold text-slate-800 dark:text-white">Instant Transfers</div>
                <p className="text-xs text-slate-500">Move funds in seconds with real-time confirmation.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 text-xl"><FaShieldAlt /></span>
              <div>
                <div className="font-semibold text-slate-800 dark:text-white">Bank-grade Security</div>
                <p className="text-xs text-slate-500">Encrypted rails and OTP-backed approvals.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-indigo-600 text-xl"><FaExchangeAlt /></span>
              <div>
                <div className="font-semibold text-slate-800 dark:text-white">Smart Routing</div>
                <p className="text-xs text-slate-500">Optimized network selection for lower fees.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6">
            <img src={heroImage} alt="Transfers" className="w-full h-48 object-cover rounded-xl" />
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Enjoy seamless transfers with multi-layer fraud checks, smart limits, and instant receipts for every transaction.
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Find a Recipient</h3>
            <p className="text-xs text-slate-500 mb-3">Search by name or mobile number.</p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Shiva or 9876"
              className="w-full px-3 py-2 rounded-lg border border-slate-300/70 dark:border-slate-600 bg-white/80 dark:bg-slate-900/40"
            />
            <div className="mt-4 space-y-3">
              {filteredPeople.map((p) => (
                <div key={p.accountNumber} className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RecipientAvatar 
                        profilePhoto={p.profilePhoto} 
                        profilePhotoContentType={p.profilePhotoContentType}
                        name={p.name}
                        size={40}
                      />
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.phone} • {p.bank}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAccount(p.accountNumber)}
                      className="p-2 rounded-lg border border-slate-200/70 dark:border-slate-700 text-slate-500 hover:text-slate-700"
                      title="Copy account number"
                    >
                      {copiedAccount === p.accountNumber ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono">{p.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => setToAccount(p.accountNumber)}
                      className="text-blue-600 hover:underline"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
              {searchLoading && (
                <div className="text-sm text-slate-500">Searching…</div>
              )}
              {!searchLoading && searchError && (
                <div className="text-sm text-rose-500">{toDisplayString(searchError)}</div>
              )}
              {!searchLoading && !searchError && filteredPeople.length === 0 && search.trim() && (
                <div className="text-sm text-slate-500">No matches found.</div>
              )}
              {!searchLoading && !searchError && !search.trim() && (
                <div className="text-sm text-slate-500">Start typing to find a recipient.</div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-6">
            <h3 className="text-lg font-semibold mb-3">Transfer Tips</h3>
            <ul className="list-disc pl-5 text-xs text-slate-500 space-y-2">
              <li>Double-check recipient account before sending.</li>
              <li>Enable notifications for instant receipts.</li>
              <li>Use saved recipients for faster transfers.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transfer Success Modal */}
      <TransferSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        details={transferDetails}
      />
    </div>
  );
};

export default TransferPage;
