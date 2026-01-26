import React from "react";
import { FaBell, FaSignOutAlt, FaCog } from "react-icons/fa";

const Header = ({ unseenCount, setShowNotifModal, handleLogout }) => (
  <div style={{
    width: "100%",
    maxWidth: 700,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 24,
    marginBottom: 24
  }}>
    <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifModal(true)}>
      <FaBell size={28} color="#3b82f6" />
      {unseenCount > 0 && (
        <span style={{
          position: "absolute",
          top: -6,
          right: -6,
          background: "#ef4444",
          color: "#fff",
          borderRadius: "50%",
          fontSize: 13,
          padding: "2px 7px",
          fontWeight: 700
        }}>{unseenCount}</span>
      )}
    </div>
    <FaCog size={26} color="#64748b" style={{ cursor: "pointer" }} title="Settings (coming soon)" />
    <FaSignOutAlt size={26} color="#ef4444" style={{ cursor: "pointer" }} onClick={handleLogout} title="Logout" />
  </div>
);

export default Header;
