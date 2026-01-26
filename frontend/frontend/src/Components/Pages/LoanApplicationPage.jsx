import React, { useMemo, useState } from "react";
import Navbar from "../Layout/Navbar";
import { useTheme } from "../../context/ThemeContext.jsx";
import { applyForLoan } from "../../services/loans";
import { toDisplayString } from "../../utils";

const baseRates = {
  SAVINGS: 10,
  CURRENT: 12
};

const offers = [
  { id: "offer-1", title: "Salary Advantage", desc: "0.50% rate discount for salary accounts", tag: "Popular" },
  { id: "offer-2", title: "Eco Saver", desc: "No processing fee for loans above ₹200,000", tag: "Limited" },
  { id: "offer-3", title: "Flexi Tenure", desc: "Prepay anytime with zero penalty", tag: "New" }
];

const calculateEMI = (amount, rate, months) => {
  if (!amount || !months || months <= 0) return 0;
  const monthlyRate = rate / 12 / 100;
  if (!monthlyRate) return amount / months;
  return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
};

const LoanApplicationPage = () => {
  const { theme } = useTheme();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const accountType = (user.accountType || user.account_type || "SAVINGS").toUpperCase();

  const [amount, setAmount] = useState(50000);
  const [tenure, setTenure] = useState(12);
  const [reason, setReason] = useState("");
  const [income, setIncome] = useState("");
  const [employment, setEmployment] = useState("SALARIED");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const offerDiscount = useMemo(() => {
    let discount = 0;
    if (Number(amount) >= 200000) discount += 0.5;
    if (Number(tenure) <= 12) discount += 0.25;
    return discount;
  }, [amount, tenure]);

  const interestRate = useMemo(() => {
    const base = baseRates[accountType] ?? 10;
    return Math.max(6, Number((base - offerDiscount).toFixed(2)));
  }, [accountType, offerDiscount]);

  const emi = useMemo(() => calculateEMI(Number(amount), interestRate, Number(tenure)), [amount, tenure, interestRate]);
  const totalPayable = useMemo(() => emi * Number(tenure || 0), [emi, tenure]);
  const totalInterest = useMemo(() => totalPayable - Number(amount || 0), [totalPayable, amount]);

  const affordability = useMemo(() => {
    const monthlyIncome = Number(income || 0);
    if (!monthlyIncome) return null;
    const safeLimit = monthlyIncome * 0.4;
    return { safeLimit, ok: emi <= safeLimit };
  }, [income, emi]);

  const suggestedTenures = useMemo(() => {
    if (!amount) return [12, 24, 36];
    if (Number(amount) < 50000) return [6, 12, 18];
    if (Number(amount) < 200000) return [12, 24, 36];
    return [24, 36, 60];
  }, [amount]);

  const validate = () => {
    const errors = {};
    if (!amount || Number(amount) < 1000) errors.amount = "Minimum amount is ₹1,000";
    if (!tenure || Number(tenure) < 6) errors.tenure = "Tenure must be at least 6 months";
    if (!reason) errors.reason = "Loan purpose is required";
    if (!user.accountNumber) errors.accountNumber = "Account number missing";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await applyForLoan({
        token: user.token,
        payload: {
          accountNumber: user.accountNumber,
          amount: Number(amount),
          tenureInMonths: Number(tenure),
          interestRate,
          reason
        }
      });
      setSuccess("Loan application submitted successfully.");
    } catch (e) {
      setError(e?.message || "Failed to submit loan application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pt-16 ${theme === "dark" ? "bg-slate-900" : "bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]"}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-md p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Apply for a Loan</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Customized offers and EMI calculator based on your profile.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Account Number</label>
                  <input
                    value={user.accountNumber || ""}
                    readOnly
                    className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.accountNumber ? "border-red-500" : "border-slate-300/70 dark:border-slate-600"} bg-slate-100 dark:bg-slate-900/40 text-sm`}
                  />
                  {fieldErrors.accountNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.accountNumber}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Employment Type</label>
                  <select
                    value={employment}
                    onChange={(e) => setEmployment(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white dark:bg-slate-900/40 text-sm"
                  >
                    <option value="SALARIED">Salaried</option>
                    <option value="SELF_EMPLOYED">Self Employed</option>
                    <option value="STUDENT">Student</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Loan Amount (₹)</label>
                  <input
                    type="number"
                    min={1000}
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setFieldErrors(prev => ({ ...prev, amount: undefined })); }}
                    className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.amount ? "border-red-500" : "border-slate-300/70 dark:border-slate-600"} bg-white dark:bg-slate-900/40 text-sm`}
                    placeholder="Enter amount"
                  />
                  {fieldErrors.amount && <p className="text-xs text-red-500 mt-1">{fieldErrors.amount}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Tenure (months)</label>
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={tenure}
                    onChange={(e) => { setTenure(e.target.value); setFieldErrors(prev => ({ ...prev, tenure: undefined })); }}
                    className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.tenure ? "border-red-500" : "border-slate-300/70 dark:border-slate-600"} bg-white dark:bg-slate-900/40 text-sm`}
                    placeholder="12"
                  />
                  {fieldErrors.tenure && <p className="text-xs text-red-500 mt-1">{fieldErrors.tenure}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Purpose</label>
                <input
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setFieldErrors(prev => ({ ...prev, reason: undefined })); }}
                  className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.reason ? "border-red-500" : "border-slate-300/70 dark:border-slate-600"} bg-white dark:bg-slate-900/40 text-sm`}
                  placeholder="Home renovation, education, business..."
                />
                {fieldErrors.reason && <p className="text-xs text-red-500 mt-1">{fieldErrors.reason}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500">Monthly Income (optional)</label>
                <input
                  type="number"
                  min={0}
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300/70 dark:border-slate-600 bg-white dark:bg-slate-900/40 text-sm"
                  placeholder="e.g. 60000"
                />
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">Interest Rate</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{interestRate}%</div>
                    {offerDiscount > 0 && <div className="text-xs text-emerald-600">Includes {offerDiscount.toFixed(2)}% offer discount</div>}
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Monthly EMI</div>
                    <div className="text-lg font-semibold text-emerald-600">₹{emi ? emi.toFixed(2) : "0"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Payable</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">₹{totalPayable ? totalPayable.toFixed(2) : "0"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Interest</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">₹{totalInterest ? totalInterest.toFixed(2) : "0"}</div>
                  </div>
                </div>
                {affordability && (
                  <div className={`mt-3 text-xs font-medium ${affordability.ok ? "text-emerald-600" : "text-rose-600"}`}>
                    Suggested EMI limit (40% income): ₹{affordability.safeLimit.toFixed(0)} — {affordability.ok ? "Within" : "Above"} limit
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Suggested tenures</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTenures.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTenure(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${Number(tenure) === t ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900/30 text-slate-600 border-slate-200 dark:border-slate-700"}`}
                    >
                      {t} months
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{toDisplayString(error)}</div>}
              {success && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{toDisplayString(success)}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </div>

          <aside className="space-y-6">
            <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-md p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Bankwise Offers</h3>
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{offer.title}</span>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-blue-100 text-blue-600">{offer.tag}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{offer.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-md p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">How it works</h3>
              <ul className="text-sm text-slate-500 dark:text-slate-300 space-y-2">
                <li>• Enter desired loan amount and tenure.</li>
                <li>• Review EMI and interest insights instantly.</li>
                <li>• Submit application for quick approval.</li>
                <li>• Track status in your dashboard.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LoanApplicationPage;
