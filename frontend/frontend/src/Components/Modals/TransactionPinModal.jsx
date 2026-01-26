import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { transactionPinApi } from '../../utils/bankingApi';
import { FiLock, FiShield, FiKey, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

/**
 * Transaction PIN Setup/Verification Modal
 * Supports 4-digit PIN with visual feedback
 */
const TransactionPinModal = ({ 
  mode = 'verify', // 'setup' | 'verify' | 'change' | 'forgot'
  onSuccess, 
  onClose,
  title = 'Enter PIN'
}) => {
  const { token } = useAuth();
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(mode === 'forgot' ? 'request_otp' : 'enter_pin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRefs = useRef([]);
  const confirmInputRefs = useRef([]);
  const currentInputRefs = useRef([]);

  // Focus first input on mount
  useEffect(() => {
    if (step === 'enter_pin' || step === 'enter_current') {
      const refs = step === 'enter_current' ? currentInputRefs : inputRefs;
      refs.current[0]?.focus();
    }
  }, [step]);

  const handlePinChange = (index, value, pinArray, setPinArray, refs) => {
    // Only allow single digits
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pinArray];
    newPin[index] = value.slice(-1); // Take only last digit
    setPinArray(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e, pinArray, setPinArray, refs) => {
    if (e.key === 'Backspace' && !pinArray[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const getPinString = (pinArray) => pinArray.join('');
  const isPinComplete = (pinArray) => pinArray.every(d => d !== '');

  const handleSetupPin = async () => {
    const pinStr = getPinString(pin);
    const confirmPinStr = getPinString(confirmPin);

    if (pinStr !== confirmPinStr) {
      setError('PINs do not match');
      return;
    }

    if (pinStr.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await transactionPinApi.setup(token, pinStr);
      setSuccess('PIN set up successfully!');
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to set up PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    const pinStr = getPinString(pin);
    
    if (pinStr.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await transactionPinApi.verify(token, pinStr);
      if (result.valid || result.success) {
        onSuccess?.(pinStr);
      } else {
        setError('Invalid PIN');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(err.message || 'Invalid PIN');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChangePin = async () => {
    const currentPinStr = getPinString(currentPin);
    const newPinStr = getPinString(pin);
    const confirmPinStr = getPinString(confirmPin);

    if (newPinStr !== confirmPinStr) {
      setError('New PINs do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await transactionPinApi.change(token, currentPinStr, newPinStr);
      setSuccess('PIN changed successfully!');
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setError(null);

    try {
      await transactionPinApi.forgotPin(token);
      setSuccess('OTP sent to your registered email/phone');
      setStep('enter_otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    const newPinStr = getPinString(pin);
    const confirmPinStr = getPinString(confirmPin);

    if (newPinStr !== confirmPinStr) {
      setError('PINs do not match');
      return;
    }

    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await transactionPinApi.reset(token, otp, newPinStr);
      setSuccess('PIN reset successfully!');
      setTimeout(() => onSuccess?.(), 1500);
    } catch (err) {
      setError(err.message || 'Failed to reset PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    switch (mode) {
      case 'setup':
        if (step === 'enter_pin' && isPinComplete(pin)) {
          setStep('confirm_pin');
          confirmInputRefs.current[0]?.focus();
        } else if (step === 'confirm_pin') {
          handleSetupPin();
        }
        break;
      case 'verify':
        handleVerifyPin();
        break;
      case 'change':
        if (step === 'enter_current') {
          setStep('enter_pin');
        } else if (step === 'enter_pin') {
          setStep('confirm_pin');
        } else {
          handleChangePin();
        }
        break;
      case 'forgot':
        if (step === 'request_otp') {
          handleForgotPin();
        } else if (step === 'enter_otp') {
          setStep('enter_pin');
        } else if (step === 'enter_pin') {
          setStep('confirm_pin');
        } else {
          handleResetPin();
        }
        break;
    }
  };

  const renderPinInputs = (pinArray, setPinArray, refs, label) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
        {label}
      </label>
      <div className="flex justify-center gap-3">
        {pinArray.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (refs.current[index] = el)}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handlePinChange(index, e.target.value, pinArray, setPinArray, refs)}
            onKeyDown={(e) => handleKeyDown(index, e, pinArray, setPinArray, refs)}
            className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  );

  const getStepContent = () => {
    if (success) {
      return (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <FiCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-green-600 dark:text-green-400 font-medium">{success}</p>
        </div>
      );
    }

    switch (mode) {
      case 'setup':
        return step === 'enter_pin' 
          ? renderPinInputs(pin, setPin, inputRefs, 'Create Your 4-Digit PIN')
          : renderPinInputs(confirmPin, setConfirmPin, confirmInputRefs, 'Confirm Your PIN');
      
      case 'verify':
        return renderPinInputs(pin, setPin, inputRefs, 'Enter Your PIN');
      
      case 'change':
        if (step === 'enter_current') {
          return renderPinInputs(currentPin, setCurrentPin, currentInputRefs, 'Enter Current PIN');
        } else if (step === 'enter_pin') {
          return renderPinInputs(pin, setPin, inputRefs, 'Enter New PIN');
        } else {
          return renderPinInputs(confirmPin, setConfirmPin, confirmInputRefs, 'Confirm New PIN');
        }
      
      case 'forgot':
        if (step === 'request_otp') {
          return (
            <div className="text-center py-4">
              <FiRefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We'll send an OTP to your registered email/phone to verify your identity.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          );
        } else if (step === 'enter_otp') {
          return (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 text-center text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter OTP"
                maxLength={6}
              />
            </div>
          );
        } else if (step === 'enter_pin') {
          return renderPinInputs(pin, setPin, inputRefs, 'Enter New PIN');
        } else {
          return renderPinInputs(confirmPin, setConfirmPin, confirmInputRefs, 'Confirm New PIN');
        }
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    
    switch (mode) {
      case 'setup':
        return step === 'enter_pin' ? 'Continue' : 'Set PIN';
      case 'verify':
        return 'Verify';
      case 'change':
        return step === 'confirm_pin' ? 'Change PIN' : 'Continue';
      case 'forgot':
        if (step === 'enter_otp') return 'Verify OTP';
        if (step === 'confirm_pin') return 'Reset PIN';
        return 'Continue';
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'setup': return FiShield;
      case 'verify': return FiLock;
      case 'change': return FiKey;
      case 'forgot': return FiRefreshCw;
      default: return FiLock;
    }
  };

  const ModeIcon = getModeIcon();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <ModeIcon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {mode === 'setup' && 'Create a 4-digit PIN for secure transactions'}
            {mode === 'verify' && 'Enter your PIN to continue'}
            {mode === 'change' && 'Change your transaction PIN'}
            {mode === 'forgot' && 'Reset your transaction PIN'}
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {getStepContent()}

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!success && step !== 'request_otp' && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (step !== 'enter_otp' && !isPinComplete(
                  step === 'confirm_pin' ? confirmPin : 
                  step === 'enter_current' ? currentPin : pin
                ))}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {getButtonText()}
              </button>
            </div>
          )}

          {mode === 'verify' && (
            <button
              type="button"
              onClick={() => onClose?.('forgot')}
              className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot PIN?
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

/**
 * Hook to manage transaction PIN state
 */
export const useTransactionPin = () => {
  const { token } = useAuth();
  const [hasPin, setHasPin] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkPinStatus = useCallback(async () => {
    try {
      const result = await transactionPinApi.hasPin(token);
      setHasPin(result.hasPin || result.hasPinSet || false);
    } catch (err) {
      console.error('Failed to check PIN status:', err);
      setHasPin(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      checkPinStatus();
    }
  }, [token, checkPinStatus]);

  return { hasPin, loading, refresh: checkPinStatus };
};

export default TransactionPinModal;
