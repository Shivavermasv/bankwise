import React, { useEffect, useState } from 'react';
import { listDeposits, depositAction } from '../../services/accounts';
import { toDisplayString } from '../../utils';
import { invalidateCache } from '../../utils/apiClient';

const statuses = ['ALL','PENDING','DEPOSITED','REJECTED'];

const DepositRequestsAdmin = ({ token, refreshTrigger = 0 }) => {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    // Invalidate cache to get fresh data
    invalidateCache('/api/account/depositRequests');
    try { const data = await listDeposits({ token, status }); setRequests(data); }
    catch(e){ setError(e.message||'Failed'); }
    finally { setLoading(false); }
  };

  // Refresh when status, token, or refreshTrigger changes
  useEffect(()=>{ if(token) load(); }, [status, token, refreshTrigger]);

  const act = async (id, action) => {
    const res = await depositAction({ token, action, depositRequestId: id });
    setMessage(res.message);
    load();
  };

  return (
    <div className="space-y-3 bg-white dark:bg-slate-800 p-4 rounded-lg border">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold flex-1">Deposit Requests</h3>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border p-1 rounded">
          {statuses.map(s=> <option key={s}>{s}</option>)}
        </select>
        <button onClick={load} className="px-3 py-1 text-sm bg-slate-200 rounded">Refresh</button>
      </div>
      {message && <div className="text-sm text-blue-600">{toDisplayString(message)}</div>}
      {error && <div className="text-sm text-red-500">{toDisplayString(error)}</div>}
      {loading ? <div>Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Account</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Reference</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r=> (
                <tr key={r.requestId} className="border-b last:border-0">
                  <td className="p-2">{r.requestId}</td>
                  <td className="p-2">{r.accountNumber}</td>
                  <td className="p-2">{r.amount}</td>
                  <td className="p-2">{r.referenceNumber}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2 flex gap-2 justify-end">
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={()=>act(r.requestId,'approve')} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Approve</button>
                        <button onClick={()=>act(r.requestId,'reject')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!requests.length && <tr><td colSpan={6} className="p-4 text-center text-slate-500">No requests</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DepositRequestsAdmin;
