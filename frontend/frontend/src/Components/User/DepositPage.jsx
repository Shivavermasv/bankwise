import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import QRPaymentModal from "./QRPaymentModal";
import { useTheme } from '../../context/ThemeContext.jsx';

const DepositPage = () => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const { theme } = useTheme();

  const depositOptions = [
    {
      id: 'qr',
      title: 'Pay by QR Code',
      description: 'Scan QR code with any UPI app',
      icon: '📱',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      action: () => setShowQRModal(true)
    },
    {
      id: 'cash',
      title: 'Cash Deposit at Bank',
      description: 'Visit nearest branch for cash deposit',
      icon: '🏦',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      action: () => alert("Find nearest branch feature coming soon!")
    },
    {
      id: 'cheque',
      title: 'Cheque Deposit',
      description: 'Upload cheque image for processing',
      icon: '📄',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      action: () => alert("Cheque deposit feature coming soon!")
    },
    {
      id: 'neft',
      title: 'NEFT/RTGS Transfer',
      description: 'Bank to bank transfer',
      icon: '🔄',
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      action: () => alert("NEFT/RTGS feature coming soon!")
    }
  ];

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#f0fdfa_0%,#e0e7ff_100%)]'}`}>
      <Navbar />
      
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "40px 20px"
      }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: "center",
            marginBottom: 40
          }}
        >
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 8
          }}
          className="text-slate-800 dark:text-white"
          >
            Deposit Money
          </h1>
          <p style={{
            fontSize: 16,
            marginBottom: 16
          }}
          className="text-slate-500 dark:text-slate-400"
          >
            Choose your preferred deposit method
          </p>
          <div style={{
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
            borderRadius: 16,
            padding: 16,
            display: "inline-block",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 4 }}>Account Number</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
              {user.accountNumber || "N/A"}
            </div>
          </div>
        </motion.div>

        {/* Deposit Options Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            marginBottom: 40
          }}
        >
          {depositOptions.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.15)" }}
              onClick={option.action}
              style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                borderRadius: 20,
                padding: 24,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                transition: "all 0.3s ease"
              }}
            >
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: option.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                marginBottom: 16,
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
              }}>
                {option.icon}
              </div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#1e293b",
                marginBottom: 8
              }}>
                {option.title}
              </h3>
              <p style={{
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.5
              }}>
                {option.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: "center" }}
        >
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "rgba(100,116,139,0.1)",
              border: "1px solid rgba(100,116,139,0.3)",
              borderRadius: 12,
              padding: "12px 24px",
              color: "#64748b",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => {
              e.target.style.background = "rgba(100,116,139,0.2)";
            }}
            onMouseOut={(e) => {
              e.target.style.background = "rgba(100,116,139,0.1)";
            }}
          >
            ← Back to Dashboard
          </button>
        </motion.div>
      </div>

      {/* QR Payment Modal */}
      {showQRModal && (
        <QRPaymentModal 
          user={user}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
};

export default DepositPage;
