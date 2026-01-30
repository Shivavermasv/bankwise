import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import { useTheme } from "../../context/ThemeContext.jsx";

const LoanRequestDetails = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { loanId } = useParams();
  const location = useLocation();
  const loan = location.state?.loan;

  const data = useMemo(() => {
    if (loan) return loan;
    return {
      id: loanId,
      accountNumber: "971034377131",
      amount: 250000,
      tenureInMonths: 24,
      interestRate: 10.5,
      reason: "Home renovation and emergency buffer for family expenses.",
      documentUrl: "",
      userName: "Shiva Verma",
      userEmail: "shiva.verma@example.com",
      status: "PENDING"
    };
  }, [loan, loanId]);

  const docPlaceholder = useMemo(() => {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
      <rect width='100%' height='100%' fill='#e2e8f0'/>
      <rect x='24' y='24' width='272' height='152' rx='14' fill='#ffffff'/>
      <path d='M90 120h140' stroke='#94a3b8' stroke-width='6' stroke-linecap='round'/>
      <path d='M90 95h140' stroke='#cbd5f5' stroke-width='6' stroke-linecap='round'/>
      <circle cx='70' cy='110' r='20' fill='#60a5fa'/>
      <text x='150' y='150' font-size='14' text-anchor='middle' fill='#64748b'>Document Preview</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const analytics = [
    { label: "Average Balance", value: "₹1,42,000" },
    { label: "Monthly Inflow", value: "₹78,500" },
    { label: "Monthly Outflow", value: "₹52,200" },
    { label: "Transaction Count", value: "46 / month" },
    { label: "Risk Score", value: "Low" },
    { label: "KYC Status", value: "VERIFIED" }
  ];

  const insights = [
    "Stable inflow with consistent salary credits.",
    "No overdraft incidents in last 6 months.",
    "Debt-to-income ratio within safe threshold.",
    "Reason aligns with policy for unsecured personal loan."
  ];

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme === 'dark' ? 'bg-slate-900' : 'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto mt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Loan Request Details</h1>
            <p className="text-sm text-slate-500 dark:text-slate-300">Loan ID: {data.id}</p>
          </div>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white hover:bg-slate-700">Back</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Applicant Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-600 dark:text-slate-400">Name</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.userName || "—"}</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Email</div>
                <div className="font-semibold text-slate-800 dark:text-white">{data.userEmail || "—"}</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Account Number</div>
                <div className="font-mono text-xs text-slate-700 dark:text-slate-200">{data.accountNumber}</div>
              </div>
              <div>
                <div className="text-slate-600 dark:text-slate-400">Status</div>
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{data.status || "PENDING"}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Loan Amount", value: `₹${Number(data.amount).toLocaleString()}` },
                { label: "Tenure", value: `${data.tenureInMonths} months` },
                { label: "Interest Rate", value: `${data.interestRate}%` }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-900/40 p-4">
                  <div className="text-xs text-slate-600 dark:text-slate-400">{item.label}</div>
                  <div className="text-lg font-semibold text-slate-800 dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Reason Provided</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{data.reason || "No reason provided."}</p>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Supporting Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map((idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4">
                    <img src={data.documentUrl || docPlaceholder} alt="Loan document" className="w-full h-40 object-cover rounded-lg" />
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">Document {idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Account Analytics</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {analytics.map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 p-3">
                    <div className="text-xs text-slate-600 dark:text-slate-400">{item.label}</div>
                    <div className="font-semibold text-slate-800 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Risk &amp; Insights</h3>
              <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                {insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanRequestDetails;
