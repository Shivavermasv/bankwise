import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";

// Default avatar component
const DefaultAvatar = ({ size = 64 }) => (
  <div 
    className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
    style={{ width: size, height: size }}
  >
    <FaUserCircle size={size * 0.7} />
  </div>
);

const UserSummaryCard = ({ user }) => {
  // Function to get verification status color and background
  const getVerificationStatusStyle = (status) => {
    if (!status) return { color: "#64748b", background: "#f1f5f9" };
    
    switch (status.toLowerCase()) {
      case 'verified':
      case 'approved':
        return { 
          color: "#047857", 
          background: "#d1fae5",
          border: "1px solid #a7f3d0"
        };
      case 'pending':
        return { 
          color: "#d97706", 
          background: "#fef3c7",
          border: "1px solid #fcd34d"
        };
      case 'rejected':
      case 'denied':
        return { 
          color: "#dc2626", 
          background: "#fee2e2",
          border: "1px solid #fca5a5"
        };
      default:
        return { 
          color: "#64748b", 
          background: "#f1f5f9",
          border: "1px solid #e2e8f0"
        };
    }
  };

  const verificationStyle = getVerificationStatusStyle(user.verificationStatus);

  // Animated balance counter (simple)
  const [displayBalance, setDisplayBalance] = useState(0);
  useEffect(() => {
    const target = Number(user.balance) || 0;
    let frame = 0; const frames = 30; // half-second at ~60fps
    const start = displayBalance;
    const diff = target - start;
    const id = setInterval(() => {
      frame++;
      const progress = frame / frames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(start + diff * eased);
      if (frame >= frames) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.balance]);

  // Build profile photo URL
  const profilePhotoUrl = user.profilePhoto && user.profilePhotoContentType
    ? `data:${user.profilePhotoContentType};base64,${user.profilePhoto}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur shadow-md p-8 w-full"
    >
      <div className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-emerald-200/40 to-sky-200/40 dark:from-emerald-500/10 dark:to-sky-500/10 rounded-full blur-2xl" />
      <div className="relative flex gap-6">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          {profilePhotoUrl ? (
            <img 
              src={profilePhotoUrl} 
              alt="Profile" 
              className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
            />
          ) : (
            <DefaultAvatar size={80} />
          )}
        </div>
        
        {/* User Info */}
        <div className="flex-1">
          <h2 className="mb-1 font-bold text-2xl tracking-tight text-slate-800 dark:text-slate-100">
            Welcome, {user.username || user.name || "User"}
          </h2>
          <div className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
            <span className="font-medium">Account:</span> {user.accountNumber} <span className="mx-2">|</span> <span className="font-medium">Role:</span> {user.role}
          </div>
          <div className="mb-5">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">Current Balance</p>
            <p className="mt-1 text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent tabular-nums">
              ₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayBalance)}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={verificationStyle}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: verificationStyle.color }} />
            Verification: {user.verificationStatus || 'Unknown'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserSummaryCard;
