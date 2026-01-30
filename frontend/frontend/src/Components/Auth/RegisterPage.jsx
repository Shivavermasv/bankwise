import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import registerAnimation from "../../assets/registerAnimation.json";
import successAnimation from "../../assets/successAnimation.json";
import { registerUser } from "../../services/auth";
import { FaUserCircle, FaCamera, FaUniversity, FaShieldAlt, FaCreditCard, FaChartLine, FaExclamationTriangle, FaTimes, FaSignInAlt } from "react-icons/fa";

const MAX_PHOTO_SIZE = 500 * 1024; // 500KB

const initialState = {
  userName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
  address: "",
  password: "",
  role: "USER",
  accountType: "SAVINGS",
  adminCode: ""
};

// Floating Banking Icons Component
const FloatingIcons = () => {
  const icons = [
    { Icon: FaUniversity, color: "#3b82f6", size: 40, top: "10%", left: "5%", delay: 0 },
    { Icon: FaShieldAlt, color: "#10b981", size: 35, top: "25%", left: "8%", delay: 0.5 },
    { Icon: FaCreditCard, color: "#8b5cf6", size: 38, top: "60%", left: "3%", delay: 1 },
    { Icon: FaChartLine, color: "#f59e0b", size: 32, top: "80%", left: "10%", delay: 1.5 },
    { Icon: FaUniversity, color: "#3b82f6", size: 45, top: "15%", right: "5%", delay: 0.3 },
    { Icon: FaShieldAlt, color: "#10b981", size: 30, top: "40%", right: "8%", delay: 0.8 },
    { Icon: FaCreditCard, color: "#8b5cf6", size: 42, top: "70%", right: "4%", delay: 1.2 },
    { Icon: FaChartLine, color: "#f59e0b", size: 36, top: "90%", right: "12%", delay: 1.8 },
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

const RegisterPage = () => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [errorModal, setErrorModal] = useState(null); // { type, title, message, showLoginButton }
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Map error codes to user-friendly modal content
  const getErrorModalContent = (errorCode, message) => {
    switch (errorCode) {
      case 'DUPLICATE_EMAIL':
        return {
          type: 'warning',
          title: 'Account Already Exists',
          message: 'An account with this email address is already registered. Would you like to login instead?',
          showLoginButton: true
        };
      case 'DUPLICATE_PHONE':
        return {
          type: 'error',
          title: 'Phone Number In Use',
          message: 'This phone number is already registered with another account. Please use a different phone number.',
          showLoginButton: false
        };
      case 'INVALID_ADMIN_CODE':
        return {
          type: 'error',
          title: 'Invalid Admin Code',
          message: 'The admin registration code you entered is incorrect. Please contact your system administrator.',
          showLoginButton: false
        };
      case 'PHOTO_TOO_LARGE':
        return {
          type: 'error',
          title: 'Photo Too Large',
          message: 'Profile photo must be less than 500KB. Please choose a smaller image.',
          showLoginButton: false
        };
      default:
        return {
          type: 'error',
          title: 'Registration Failed',
          message: message || 'An error occurred during registration. Please try again.',
          showLoginButton: false
        };
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_PHOTO_SIZE) {
      setErrors(prev => ({ ...prev, profilePhoto: "Photo must be less than 500KB" }));
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, profilePhoto: "Please select an image file" }));
      return;
    }
    
    setErrors(prev => ({ ...prev, profilePhoto: undefined }));
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result);
      // Extract base64 without data URL prefix
      const base64 = reader.result.split(',')[1];
      setProfilePhoto({ data: base64, contentType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!form.userName) errs.userName = "Name is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!/^[0-9+\-]{8,15}$/.test(form.phoneNumber)) errs.phoneNumber = "Invalid phone number";
    if (!form.password || form.password.length < 6) errs.password = "Password must be at least 6 characters";
    if (!form.role) errs.role = "Role is required";
    if ((form.role === "USER" || form.role === "CUSTOMER") && !form.accountType) errs.accountType = "Account type is required";
    if (form.role === "ADMIN" && !form.adminCode) errs.adminCode = "Admin code is required";
    return errs;
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      // Only include accountType for USER/CUSTOMER role
      const body = { ...form };
      if (form.role !== "USER" && form.role !== "CUSTOMER") {
        delete body.accountType;
      }
      if (form.role !== "ADMIN") {
        delete body.adminCode;
      }
      // Add profile photo if selected
      if (profilePhoto) {
        body.profilePhoto = profilePhoto.data;
        body.profilePhotoContentType = profilePhoto.contentType;
      }
      await registerUser(body);
      setErrors({}); // Clear any previous error
      setSuccess(true);
      setShowSuccessAnim(true);
      setTimeout(() => {
        setShowSuccessAnim(false);
        navigate("/login", {
          state: {
            email: form.email,
            password: form.password
          }
        });
      }, 2000);
    } catch (e) {
      // Check if it's a structured error with errorCode
      const errorCode = e?.errorCode;
      const message = e?.message || "Registration failed. Try again.";
      
      if (errorCode) {
        setErrorModal(getErrorModalContent(errorCode, message));
      } else {
        setErrors({ submit: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Error Modal Component
  const ErrorModal = () => {
    if (!errorModal) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setErrorModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                errorModal.type === 'warning' 
                  ? 'bg-amber-100 dark:bg-amber-900/30' 
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <FaExclamationTriangle className={`text-3xl ${
                  errorModal.type === 'warning' 
                    ? 'text-amber-500' 
                    : 'text-red-500'
                }`} />
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                {errorModal.title}
              </h3>
              
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {errorModal.message}
              </p>
              
              <div className="flex gap-3 justify-center">
                {errorModal.showLoginButton && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/login', { state: { email: form.email } })}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg"
                  >
                    <FaSignInAlt />
                    Go to Login
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setErrorModal(null)}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-xl ${
                    errorModal.showLoginButton 
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
                  }`}
                >
                  <FaTimes />
                  {errorModal.showLoginButton ? 'Try Again' : 'Close'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      {/* Error Modal */}
      <ErrorModal />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-10 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233b82f6' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      {/* Floating Banking Icons */}
      <FloatingIcons />

      {/* Decorative Circles */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400/10 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-violet-400/10 dark:bg-violet-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-center min-h-screen py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, type: "spring" }}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/20 dark:border-slate-700/50"
        >
          {!showSuccessAnim ? (
            <Lottie
              animationData={registerAnimation}
              loop
              style={{ width: 100, margin: "0 auto 12px" }}
            />
          ) : (
            <Lottie
              animationData={successAnimation}
              loop={false}
              style={{ width: 100, margin: "0 auto 12px" }}
            />
          )}
          
          {/* Profile Photo Upload */}
          {!showSuccessAnim && (
            <div className="text-center mb-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full mx-auto cursor-pointer relative overflow-hidden border-[3px] border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-100 dark:bg-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <FaUserCircle size={50} className="text-slate-400 dark:text-slate-500" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 flex justify-center">
                  <FaCamera size={12} className="text-white" />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
                aria-label="Upload profile photo"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Profile Photo (optional, max 500KB)</p>
              {errors.profilePhoto && <p className="text-red-400 text-xs mt-1">{errors.profilePhoto}</p>}
            </div>
          )}

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-xl font-bold text-slate-800 dark:text-white mb-4"
          >
            Open a New Account
          </motion.h2>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <motion.input
                name="userName"
                placeholder="Full Name"
                value={form.userName}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.userName ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                whileFocus={{ scale: 1.01 }}
                aria-label="Full Name"
              />
              {errors.userName && <p className="text-red-400 text-xs mt-1">{errors.userName}</p>}
            </div>

            <div>
              <input
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.dateOfBirth ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                aria-label="Date of Birth"
              />
              {errors.dateOfBirth && <p className="text-red-400 text-xs mt-1">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                aria-label="Email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                name="phoneNumber"
                placeholder="Phone Number"
                value={form.phoneNumber}
                onChange={handleChange}
                inputMode="numeric"
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.phoneNumber ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                aria-label="Phone Number"
              />
              {errors.phoneNumber && <p className="text-red-400 text-xs mt-1">{errors.phoneNumber}</p>}
            </div>

            <div>
              <input
                name="address"
                placeholder="Address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                aria-label="Address"
              />
            </div>

            <div>
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                aria-label="Password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.role ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                aria-label="Account Role"
              >
                <option value="USER">User</option>
                <option value="CUSTOMER">Customer</option>
                <option value="ADMIN">Admin</option>
              </select>
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
            </div>

            {/* Admin Code field */}
            {form.role === "ADMIN" && (
              <div>
                <input
                  name="adminCode"
                  type="password"
                  placeholder="Admin Registration Code"
                  value={form.adminCode}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border ${errors.adminCode ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  aria-label="Admin Registration Code"
                />
                {errors.adminCode && <p className="text-red-400 text-xs mt-1">{errors.adminCode}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter the admin registration code provided by system administrator</p>
              </div>
            )}

            {/* Account Type for USER/CUSTOMER */}
            {(form.role === "USER" || form.role === "CUSTOMER") && (
              <div>
                <select
                  name="accountType"
                  value={form.accountType}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-lg border ${errors.accountType ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'} bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  aria-label="Account Type"
                >
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                </select>
                {errors.accountType && <p className="text-red-400 text-xs mt-1">{errors.accountType}</p>}
              </div>
            )}

            {errors.submit && !success && (
              <p className="text-red-400 text-center text-sm">{errors.submit}</p>
            )}
            
            {success && showSuccessAnim && (
              <p className="text-emerald-500 text-center font-semibold">
                Registration successful! Redirecting to login...
              </p>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
            >
              {submitting ? "Creating..." : "Create Account"}
            </motion.button>
            
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2"
            >
              Already have an account? Login
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;