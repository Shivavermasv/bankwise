import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import { useTheme } from "../../context/ThemeContext.jsx";
import { fetchKycDetails, fetchKycDocument, updateAccountStatus } from "../../services/accounts";

const AccountApprovalDetails = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { accountNumber } = useParams();
  const location = useLocation();
  const account = location.state?.account;

  const [verificationStatus, setVerificationStatus] = useState(account?.verificationStatus || "PENDING");
  const [kyc, setKyc] = useState(null);
  const [kycError, setKycError] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docContentType, setDocContentType] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");

  const data = useMemo(() => {
    if (account) return { ...account, verificationStatus };
    return {
      accountNumber,
      userName: "Shiva Verma",
      userEmail: "shiva.verma@example.com",
      accountType: "SAVINGS",
      balance: 8000,
      verificationStatus,
      phone: "+91 98765 43210",
      address: "12/4, MG Road, Bengaluru"
    };
  }, [account, accountNumber, verificationStatus]);

  const docPlaceholder = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
      <rect width='100%' height='100%' fill='#e2e8f0'/>
      <rect x='24' y='24' width='272' height='152' rx='14' fill='#ffffff'/>
      <circle cx='90' cy='110' r='24' fill='#34d399'/>
      <path d='M140 95h120' stroke='#94a3b8' stroke-width='6' stroke-linecap='round'/>
      <path d='M140 125h80' stroke='#cbd5f5' stroke-width='6' stroke-linecap='round'/>
      <text x='160' y='160' font-size='14' text-anchor='middle' fill='#64748b'>KYC Document</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const aadharPlaceholder = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='220'>
      <rect width='100%' height='100%' rx='18' fill='#f1f5f9'/>
      <rect x='20' y='24' width='300' height='172' rx='14' fill='#ffffff'/>
      <circle cx='80' cy='95' r='28' fill='#38bdf8'/>
      <rect x='130' y='72' width='160' height='12' rx='6' fill='#94a3b8'/>
      <rect x='130' y='98' width='120' height='10' rx='5' fill='#cbd5f5'/>
      <text x='170' y='155' font-size='14' fill='#64748b'>Aadhaar Card</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const panPlaceholder = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='220'>
      <rect width='100%' height='100%' rx='18' fill='#f8fafc'/>
      <rect x='20' y='24' width='300' height='172' rx='14' fill='#ffffff'/>
      <circle cx='80' cy='95' r='28' fill='#6366f1'/>
      <rect x='130' y='72' width='160' height='12' rx='6' fill='#94a3b8'/>
      <rect x='130' y='98' width='120' height='10' rx='5' fill='#cbd5f5'/>
      <text x='170' y='155' font-size='14' fill='#64748b'>PAN Card</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const analytics = [
    { label: "Average Balance", value: "₹62,400" },
    { label: "Monthly Credits", value: "₹48,200" },
    { label: "Monthly Debits", value: "₹31,900" },
    { label: "KYC Risk", value: "Low" },
    { label: "Account Age", value: "3 months" },
    { label: "Device Trust", value: "High" }
  ];

  const notes = [
    "Address verified through uploaded utility bill.",
    "No duplicate profiles found across KYC submissions.",
    "Phone number matches OTP verification logs.",
    "Transaction profile within expected thresholds."
  ];

  useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem("user") || "{}").token;
    if (!token || !accountNumber) return;
    let active = true;
    setKycLoading(true);
    setKycError("");
    fetchKycDetails({ token, accountNumber })
      .then((data) => {
        if (!active) return;
        setKyc(data);
      })
      .catch((e) => {
        if (!active) return;
        setKycError(e?.message || "Failed to load KYC details");
      })
      .finally(() => active && setKycLoading(false));
    return () => {
      active = false;
    };
  }, [accountNumber]);

  useEffect(() => {
    const token = JSON.parse(sessionStorage.getItem("user") || "{}").token;
    if (!activeDoc || !token) return;
    let active = true;
    setDocLoading(true);
    setDocError("");
    setDocUrl("");
    setDocContentType("");
    fetchKycDocument({ token, accountNumber, type: activeDoc.type })
      .then(({ url, contentType }) => {
        if (!active) return;
        setDocUrl(url);
        setDocContentType(contentType || "");
      })
      .catch((e) => {
        if (!active) return;
        setDocError(e?.message || "Failed to load document");
      })
      .finally(() => active && setDocLoading(false));
    return () => {
      active = false;
    };
  }, [activeDoc, accountNumber]);

  const handleApprove = async () => {
    const token = JSON.parse(sessionStorage.getItem("user") || "{}").token;
    if (!token || !accountNumber) return;
    setActionLoading(true);
    try {
      await updateAccountStatus({ token, accountNumber, status: "VERIFIED" });
      setVerificationStatus("VERIFIED");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme === 'dark' ? 'bg-slate-900' : 'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Account Approval Details</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">Account: {data.accountNumber}</p>
          </div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700">Back</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Profile Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Name</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.userName || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500">Email</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.userEmail || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500">Phone</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.phone || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500">Account Type</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.accountType || "—"}</div>
              </div>
              <div>
                <div className="text-slate-500">Balance</div>
                <div className="font-semibold text-slate-800 dark:text-white">₹{Number(data.balance || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-500">Verification</div>
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{data.verificationStatus || "PENDING"}</span>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Address</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{kyc?.address || data.address || "No address available."}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">KYC Documents</h3>
              {kycLoading && <div className="text-xs text-slate-500">Loading KYC…</div>}
              {kycError && <div className="text-xs text-rose-500">{kycError}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Aadhaar Card", number: kyc?.aadharNumber || "—", type: "aadhar" },
                  { label: "PAN Card", number: kyc?.panNumber || "—", type: "pan" }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => setActiveDoc(item)}
                    className="text-left rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/40 p-4 hover:shadow-sm transition"
                  >
                    <img src={docPlaceholder} alt={item.label} className="w-full h-40 object-cover rounded-lg" />
                    <div className="mt-2 text-xs text-slate-500">{item.label}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300">{item.number}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Account Analytics</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {analytics.map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 p-3">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="font-semibold text-slate-800 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Reviewer Notes</h3>
              <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                {notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {activeDoc && (
        <div className="fixed inset-0 z-[1200] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{activeDoc.label}</h3>
              <button onClick={() => setActiveDoc(null)} className="text-slate-500">✕</button>
            </div>
            {docLoading && <div className="text-sm text-slate-500">Loading document…</div>}
            {docError && <div className="text-sm text-rose-500">{docError}</div>}
            {!docLoading && !docError && docUrl && (docContentType.includes('pdf') ? (
              <iframe
                title="KYC Document"
                src={docUrl}
                className="w-full h-60 rounded-xl border border-slate-200"
              />
            ) : (
              <img
                src={docUrl}
                alt={activeDoc.label}
                className="w-full h-60 object-cover rounded-xl border border-slate-200"
              />
            ))}
            {!docLoading && !docError && !docUrl && (
              <img
                src={activeDoc.type === "aadhar" ? aadharPlaceholder : panPlaceholder}
                alt={activeDoc.label}
                className="w-full h-52 object-cover rounded-xl"
              />
            )}
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Document Number: <span className="font-semibold">{activeDoc.number}</span>
            </div>
            {data.verificationStatus !== "VERIFIED" && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="mt-5 w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? "Approving…" : "Approve Account"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountApprovalDetails;
