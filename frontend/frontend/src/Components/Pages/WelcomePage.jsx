import React from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import welcomeAnimation from "../../assets/welcome_animation.json";

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff", // Match animation background
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <Lottie animationData={welcomeAnimation} loop={true} />
      </div>
      <h1 style={{ margin: "32px 0 16px 0", fontWeight: 700, color: "#222" }}>
        Welcome to Bankwise
      </h1>
      <p style={{ color: "#555", marginBottom: 32, textAlign: "center" }}>
        Secure. Simple. Smart Banking.<br />
        Manage your money, open new accounts, and more.
      </p>
      <div style={{ display: "flex", gap: 16 }}>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "12px 32px",
            fontSize: 18,
            borderRadius: 8,
            border: "none",
            background: "#3b82f6",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Login
        </button>
        <button
          onClick={() => navigate("/register")}
          style={{
            padding: "12px 32px",
            fontSize: 18,
            borderRadius: 8,
            border: "1px solid #10b981",
            background: "#fff",
            color: "#10b981",
            cursor: "pointer"
          }}
        >
          Create/Open Account
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;