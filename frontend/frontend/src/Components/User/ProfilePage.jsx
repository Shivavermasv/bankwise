import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext.jsx';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCamera, FaShieldAlt, FaStar, FaSave, FaIdCard, FaCheckCircle } from 'react-icons/fa';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Simple success toast
const SuccessToast = ({ show, onClose }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-emerald-500 text-white rounded-xl shadow-lg flex items-center gap-3"
      >
        <FaCheckCircle className="text-xl" />
        <span className="font-medium">Profile updated successfully!</span>
        <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">✕</button>
      </motion.div>
    )}
  </AnimatePresence>
);

const ProfilePage = () => {
  const { theme } = useTheme();
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'));
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Editable fields
  const [formData, setFormData] = useState({
    name: user.name || user.username || '',
    phone: user.phone || '',
    address: user.address || '',
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('phone', formData.phone);
      formDataObj.append('address', formData.address);
      if (photoFile) {
        formDataObj.append('profilePhoto', photoFile);
      }

      const response = await fetch(`${API_BASE}/api/user/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formDataObj
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update session storage
      const newUserData = { ...user, ...updatedUser };
      sessionStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentPhoto = photoPreview || 
    (user.profilePhoto && user.profilePhotoContentType 
      ? `data:${user.profilePhotoContentType};base64,${user.profilePhoto}` 
      : null);

  return (
    <div className={`min-h-screen pt-16 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-indigo-50'}`}>
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <FaUser className="text-blue-600" />
            My Profile
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your account details and preferences
          </p>
        </motion.div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 text-center">
              {/* Profile Photo */}
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 mx-auto">
                  {currentPhoto ? (
                    <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                      {(formData.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors">
                  <FaCamera />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{formData.name}</h2>
              <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
              
              {/* Account Info */}
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <FaIdCard className="text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-500">Account Number</p>
                    <p className="font-mono font-medium text-slate-800 dark:text-white">{user.accountNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <FaShieldAlt className="text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-500">Verification Status</p>
                    <p className="font-medium text-emerald-600">{user.verificationStatus || 'VERIFIED'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <FaStar className="text-amber-500" />
                  <div>
                    <p className="text-xs text-slate-500">Credit Score</p>
                    <p className="font-medium text-amber-600">{user.creditScore || 700}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Edit Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                Edit Profile
              </h3>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    <FaUser className="text-slate-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    <FaEnvelope className="text-slate-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    <FaPhone className="text-slate-400" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                    <FaMapMarkerAlt className="text-slate-400" />
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter your address"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <FaSave />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* KYC Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
                KYC Documents
              </h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  ✅ Your KYC documents have been verified. To update your documents, please contact support.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <SuccessToast show={success} onClose={() => setSuccess(false)} />
    </div>
  );
};

export default ProfilePage;
