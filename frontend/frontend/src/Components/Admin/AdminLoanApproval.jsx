import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import { useTheme } from '../../context/ThemeContext.jsx';
import { listPendingLoans, approveLoan, rejectLoan } from "../../services/loans";
import { getErrorMessage } from "../../utils/apiClient";
import { toDisplayString } from "../../utils";

const AdminLoanApproval = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function fetchLoans() {
      setLoading(true);
      setError("");
      try {
        const data = await listPendingLoans({ token: user.token });
        setLoans(data || []);
      } catch (err) {
        setError(getErrorMessage(err, "Error loading loans"));
      } finally {
        setLoading(false);
      }
    }
    fetchLoans();
  }, [user.token]);

  const handleAction = async (loanId, approve) => {
    setActionLoading(loanId + (approve ? "-approve" : "-reject"));
    try {
      if (approve) {
        await approveLoan({ token: user.token, loanId });
      } else {
        await rejectLoan({ token: user.token, loanId });
      }
      setLoans(loans => loans.filter(l => l.id !== loanId));
    } catch (err) {
      alert(err.message || "Error performing action");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#f0fdfa_0%,#e0e7ff_100%)]'}`}>
      <Navbar />
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl shadow-lg shadow-slate-900/5 border border-slate-200/60 dark:border-slate-700/50 p-8 mt-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white mb-4">Pending Loan Applications</h2>
        {loading ? <div className="text-slate-500">Loading...</div> : error ? <div className="text-rose-600 font-medium">{toDisplayString(error)}</div> : loans.length === 0 ? <div className="text-slate-500">No pending loans</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300">
                  {['Account No','Amount','Tenure','Interest','Reason','PDF','Action'].map(h => <th key={h} className="p-3 text-left font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loans.map(loan => (
                  <tr
                    key={loan.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/loan-approval/${loan.id}`, { state: { loan } })}
                  >
                    <td className="p-3 font-mono text-xs">{loan.accountNumber}</td>
                    <td className="p-3">₹{loan.amount}</td>
                    <td className="p-3">{loan.tenureInMonths} mo</td>
                    <td className="p-3">{loan.interestRate}%</td>
                    <td className="p-3 max-w-xs truncate" title={loan.reason}>{loan.reason}</td>
                    <td className="p-3">{loan.documentUrl ? <a className="text-blue-600 dark:text-blue-400 underline" href={loan.documentUrl} target="_blank" rel="noopener noreferrer">PDF</a> : <span className="text-slate-400">-</span>}</td>
                    <td className="p-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleAction(loan.id, true)} disabled={actionLoading === loan.id + '-approve'} className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow ${actionLoading===loan.id+'-approve'?'bg-emerald-400 cursor-not-allowed':'bg-emerald-600 hover:bg-emerald-500'}`}>Approve</button>
                      <button onClick={() => handleAction(loan.id, false)} disabled={actionLoading === loan.id + '-reject'} className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow ${actionLoading===loan.id+'-reject'?'bg-rose-400 cursor-not-allowed':'bg-rose-600 hover:bg-rose-500'}`}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLoanApproval;
