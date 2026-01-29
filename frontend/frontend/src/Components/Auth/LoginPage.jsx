import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaUniversity, FaShieldAlt, FaCreditCard, FaChartLine, FaLock, FaWallet } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { loginWithCredentials as apiLogin, verifyOtpAndFetchToken as apiVerifyOtp } from "../../utils/authApi";
import { toDisplayString } from "../../utils";
import { storeUser, getStoredUser } from "../../utils/auth";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Floating Banking Icons Component
const FloatingIcons = () => {
  const icons = [
    { Icon: FaUniversity, color: "#3b82f6", size: 40, top: "10%", left: "5%", delay: 0 },
    { Icon: FaShieldAlt, color: "#10b981", size: 35, top: "30%", left: "8%", delay: 0.5 },
    { Icon: FaCreditCard, color: "#8b5cf6", size: 38, top: "55%", left: "3%", delay: 1 },
    { Icon: FaWallet, color: "#f59e0b", size: 32, top: "75%", left: "10%", delay: 1.5 },
    { Icon: FaLock, color: "#ec4899", size: 28, top: "90%", left: "6%", delay: 2 },
    { Icon: FaUniversity, color: "#3b82f6", size: 45, top: "15%", right: "5%", delay: 0.3 },
    { Icon: FaChartLine, color: "#10b981", size: 30, top: "35%", right: "8%", delay: 0.8 },
    { Icon: FaCreditCard, color: "#8b5cf6", size: 42, top: "60%", right: "4%", delay: 1.2 },
    { Icon: FaShieldAlt, color: "#f59e0b", size: 36, top: "80%", right: "12%", delay: 1.8 },
  ];

  return (
    <>
      {icons.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 0.15, 
            scale: 1,
            y: [0, -15, 0],
          }}
          transition={{
            delay: item.delay,
            duration: 3,
            y: { repeat: Infinity, duration: 4 + index * 0.5, ease: "easeInOut" }
          }}
          className="absolute hidden lg:block pointer-events-none"
          style={{ top: item.top, left: item.left, right: item.right }}
        >
          <item.Icon size={item.size} color={item.color} />
        </motion.div>
      ))}
    </>
  );
};

// Utility function to mask email for OTP display
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  
  // Show first 2 characters and last 1 character of local part
  const visibleStart = localPart.slice(0, 2);
  const visibleEnd = localPart.slice(-1);
  const maskedMiddle = '*'.repeat(Math.max(3, localPart.length - 3));
  
  // Show first character and last part of domain
  const [domainName, tld] = domain.split('.');
  const maskedDomainStart = domainName.slice(0, 1);
  const maskedDomainMiddle = '*'.repeat(Math.max(2, domainName.length - 1));
  
  return `${visibleStart}${maskedMiddle}${visibleEnd}@${maskedDomainStart}${maskedDomainMiddle}.${tld}`;
};

const LoginPage = () => {
  const [step, setStep] = useState("login"); // login | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  // Create refs properly outside of any callback
  const otpRefs = [
    useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null)
  ];

  // Check if user is already logged in and redirect
  useEffect(() => {
    const user = getStoredUser();
    
    if (user) {
      // User is already logged in with valid token, redirect to appropriate home
      if (user.role === "ADMIN" || user.role === "MANAGER") {
        navigate("/admin-home", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [navigate]);
  
  const [showPwd, setShowPwd] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [pwdError, setPwdError] = useState("");

  // OTP timer effect
  React.useEffect(() => {
    if (step === "otp" && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, otpTimer]);

  // Email and password validation
  const isEmailValid = emailRegex.test(email);
  const isPwdValid = password.length >= 4;

  // Handle login submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPwdError("");
    let valid = true;
    if (!isEmailValid) {
      setEmailError("Please enter a valid email.");
      valid = false;
    }
    if (!isPwdValid) {
      setPwdError("Password must be at least 4 characters.");
      valid = false;
    }
    if (!valid) return;

    try {
      const result = await apiLogin({ email, password });
      if (result.step === 'otp') {
        setStep('otp');
        setOtp(["", "", "", "", "", ""]);
        setOtpError("");
        setOtpTimer(60);
        return;
      }
      if (result.step === 'authenticated') {
        const data = result.user;
        storeUser(data);
        sessionStorage.setItem('justLoggedIn', 'true');
        if (data.role === 'ADMIN' || data.role === 'MANAGER') {
          navigate('/admin-home');
        } else {
          navigate('/home');
        }
        return;
      }
      setError('Unexpected response.');
    } catch (err) {
      setError(err.message || 'Network error. Try again.');
    } finally {
      // global loader handled centrally
    }
  };

  // Handle OTP input
  const handleOtpChange = (value, idx) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value && idx < 5) {
      otpRefs[idx + 1].current.focus();
    }
    if (!value && idx > 0) {
      otpRefs[idx - 1].current.focus();
    }
  };

  // Handle OTP submit
  const handleOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    const otpValue = otp.join("");
    if (!/^\d{6}$/.test(otpValue)) {
      setOtpError("OTP must be 6 digits.");
      return;
    }
    try {
      const data = await apiVerifyOtp({ email, otp: otpValue });
      if (!data || !data.token) {
        setOtpError('OTP verification failed');
        return;
      }
      storeUser(data);
      sessionStorage.setItem('justLoggedIn', 'true');
      if (data.role === 'ADMIN' || data.role === 'MANAGER') {
        navigate('/admin-home');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setOtpError(err.message || 'Network error. Try again.');
    } finally {
      // global loader handled centrally
    }
  };

  // Animations
  const formVariants = {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -40 },
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-gradient-to-br from-indigo-50 via-blue-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Floating Banking Icons */}
      <FloatingIcons />

      {/* Decorative Circles */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-center min-h-screen py-8 px-4">
        <AnimatePresence mode="wait">
          {step === "login" && (
            <motion.form
              key="login"
              onSubmit={handleLogin}
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 border border-white/20 dark:border-slate-700/50 space-y-5"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaLock className="text-white text-2xl" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome Back</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Sign in to your account</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  autoFocus
                  onChange={e => {
                    setEmail(e.target.value);
                    setEmailError("");
                    setError("");
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg border ${emailError ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="Enter your email"
                  aria-label="Email address"
                />
                {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setPwdError("");
                    setError("");
                  }}
                  className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${pwdError ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="Enter your password"
                  aria-label="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <FaEyeSlash /> : <FaEye />}
                </button>
                {pwdError && <p className="text-red-400 text-xs mt-1">{pwdError}</p>}
              </div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-center text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg"
                >
                  {toDisplayString(error)}
                </motion.div>
              )}
              
              <button
                type="submit"
                disabled={!(isEmailValid && isPwdValid)}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Login
              </button>
              
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Register
                </button>
              </p>
            </motion.form>
          )}

          {step === "otp" && (
            <motion.form
              key="otp"
              onSubmit={handleOtp}
              variants={formVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 border border-white/20 dark:border-slate-700/50 space-y-5 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaShieldAlt className="text-white text-2xl" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Enter OTP</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Enter the 6-digit verification code sent to
                <br />
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{maskEmail(email)}</span>
              </p>
              
              <div className="flex justify-center gap-2 my-4">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    value={digit}
                    onChange={e => handleOtpChange(e.target.value, idx)}
                    onKeyDown={e => {
                      if (e.key === "Backspace" && !otp[idx] && idx > 0) {
                        otpRefs[idx - 1].current.focus();
                      }
                    }}
                    className={`w-11 h-12 text-2xl text-center rounded-lg border ${otpError ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                    maxLength={1}
                    inputMode="numeric"
                    autoFocus={idx === 0}
                    aria-label={`OTP digit ${idx + 1}`}
                  />
                ))}
              </div>
              
              {otpError && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-sm"
                >
                  {otpError}
                </motion.p>
              )}
              
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                {otpTimer > 0 ? `Expires in ${otpTimer}s` : "OTP expired. Please login again."}
              </p>
              
              <button
                type="submit"
                disabled={otp.join("").length !== 6 || otpTimer === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Verify OTP
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setOtp(["", "", "", "", "", ""]);
                  setOtpError("");
                  setError("");
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Back to Login
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage;