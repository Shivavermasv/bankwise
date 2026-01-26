import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as QRCode from "qrcode";
import { createDepositRequest } from '../../services/accounts';
import { toDisplayString } from '../../utils';
import { FaTimes, FaQrcode, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

const QRPaymentModal = ({ user, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const [step, setStep] = useState("amount"); // amount -> qr -> reference -> success
  const [amount, setAmount] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Focus trap and keyboard handling
  useEffect(() => {
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  
  // Get account number with fallback options
  const getAccountNumber = () => {
    return user.accountNumber || user.account_number || user.accountId || user.id || "";
  };

  // Generate QR Code
  const generateQR = async (amount) => {
    try {
      // Get account number from user object
      const accountNumber = getAccountNumber();
      
      // UPI payment string format - using proper UPI format
      // For testing, you can use: test@paytm, test@ybl, etc.
      // In production, use your actual merchant UPI ID
      const upiString = `upi://pay?pa=test@paytm&pn=Bankwise%20Bank&am=${amount}&cu=INR&tn=Deposit%20Account%20${accountNumber}&mode=02&purpose=00`;
      const qrDataUrl = await QRCode.toDataURL(upiString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch {
      setError("Failed to generate QR code");
    }
  };

  const handleAmountSubmit = () => {
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (amount > 50000) {
      setError("Maximum deposit limit is ₹50,000");
      return;
    }
    setError("");
    generateQR(amount);
    setStep("qr");
  };

  const handlePaymentComplete = () => {
    setStep("reference");
  };

  const handleReferenceSubmit = async () => {
    if (!referenceNumber || referenceNumber.length < 8) {
      setError("Please enter a valid reference number (minimum 8 characters)");
      return;
    }

    // Validate account number
    const accountNumber = getAccountNumber();
    if (!accountNumber) {
      setError("Account number not found. Please login again.");
      return;
    }

    setLoading(true);
    setError("");

    // Prepare JSON payload for @RequestBody endpoint
    const depositRequestDto = {
      accountNumber: String(accountNumber),
      amount: parseFloat(amount),
      refferenceNumber: referenceNumber
    };

    try {
      await createDepositRequest({
        token: user.token,
        accountNumber: String(accountNumber),
        amount: parseFloat(amount),
        reference: referenceNumber
      });
      setStep("success");
      setTimeout(() => {
        navigate("/transactions");
      }, 3000);
    } catch (e) {
      setError(e?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-payment-title"
    >
      <AnimatePresence mode="wait">
        <motion.div
          ref={modalRef}
          key={step}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 dark:border-slate-700/50 relative"
        >
          {/* Close Button */}
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>

          {/* Amount Step */}
          {step === "amount" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <FaQrcode className="text-white text-2xl" />
              </div>
              <h2 id="qr-payment-title" className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Enter Deposit Amount
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                How much would you like to deposit?
              </p>

              {/* Account info */}
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                Account: {getAccountNumber() || "Not found"}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 mb-6">
                <label className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-4 text-lg font-semibold border-2 border-blue-200 dark:border-blue-700 rounded-xl outline-none text-center bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Minimum: ₹1 | Maximum: ₹50,000
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 justify-center text-red-500 dark:text-red-400 text-sm mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <FaExclamationCircle />
                  <span>{toDisplayString(error)}</span>
                </div>
              )}

              <button
                onClick={handleAmountSubmit}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                Generate QR Code
              </button>
            </div>
          )}

          {/* QR Code Step */}
          {step === "qr" && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Scan QR Code
              </h2>
              <p className="text-lg font-semibold text-emerald-500 dark:text-emerald-400 mb-4">
                Amount: ₹{amount}
              </p>
              
              <div className="bg-white dark:bg-slate-700 rounded-2xl p-6 mb-6 shadow-lg inline-block">
                {qrCodeUrl && (
                  <img 
                    src={qrCodeUrl} 
                    alt="Payment QR Code"
                    className="w-64 h-64 rounded-xl mx-auto"
                  />
                )}
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300 mb-6 text-left space-y-1">
                <p>1. Open any UPI app (PhonePe, Paytm, GPay)</p>
                <p>2. Scan the QR code above</p>
                <p>3. Complete the payment</p>
                <p>4. Note down the reference number</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-6 text-sm text-amber-700 dark:text-amber-300">
                ⚠️ <strong>Testing Mode:</strong> This QR uses test@paytm for demonstration.
              </div>

              <button
                onClick={handlePaymentComplete}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all"
              >
                I have completed the payment
              </button>
            </div>
          )}

          {/* Reference Number Step */}
          {step === "reference" && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                Enter Reference Number
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Please enter the transaction reference number from your payment app
              </p>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 mb-6">
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Enter reference number"
                  className="w-full p-4 text-base border-2 border-emerald-200 dark:border-emerald-700 rounded-xl outline-none text-center bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 justify-center text-red-500 dark:text-red-400 text-sm mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <FaExclamationCircle />
                  <span>{toDisplayString(error)}</span>
                </div>
              )}

              <button
                onClick={handleReferenceSubmit}
                disabled={loading}
                className={`w-full font-semibold py-4 rounded-xl transition-all ${
                  loading 
                    ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/30'
                } text-white`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : "Submit Deposit Request"}
              </button>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <FaCheckCircle className="text-white text-5xl" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mb-4">
                Deposit Request Submitted!
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Your deposit request has been submitted successfully. 
                It will be verified by our team and processed shortly.
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
                Redirecting to transaction history...
              </p>
              
              <button
                onClick={() => navigate("/transactions")}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
              >
                View Transactions
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QRPaymentModal;
