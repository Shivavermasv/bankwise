import React, { useEffect, useState } from 'react';
import { Navbar } from '../Layout';
import { useTheme } from '../../context/ThemeContext.jsx';
import { createSupportTicket, listMySupportTickets } from '../../services/support';
import { toDisplayString } from '../../utils';

const SupportPage = () => {
  const { theme } = useTheme();
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [activeTab, setActiveTab] = useState('ticket');
  const [form, setForm] = useState({ category: 'GENERAL', subject: '', description: '', priority: 'MEDIUM' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const loadMyTickets = async () => {
    if (!user.token) return;
    setTicketsLoading(true);
    try {
      const data = await listMySupportTickets({ token: user.token });
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    loadMyTickets();
  }, []);

  const validate = () => {
    const errors = {};
    if (!form.subject) errors.subject = 'Subject is required';
    if (!form.description) errors.description = 'Description is required';
    return errors;
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setLoading(true);
    try {
      await createSupportTicket({
        token: user.token,
        payload: { ...form }
      });
      setMessage('Support ticket submitted successfully.');
      setForm({ category: 'GENERAL', subject: '', description: '', priority: 'MEDIUM' });
      await loadMyTickets();
    } catch (e) {
      setError(e?.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-md p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Support</h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm">Get help, open tickets, and check system updates.</p>
          </div>
          <div className="flex gap-2">
            {['ticket','faq','status','chat'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {tab === 'ticket' ? 'Open Ticket' : tab === 'faq' ? 'FAQ' : tab === 'status' ? 'System Status' : 'Live Chat'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'ticket' && (
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={submitTicket} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300/70 bg-white text-sm"
                  >
                    {['GENERAL','TRANSACTION','LOAN','KYC','TECHNICAL'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl border border-slate-300/70 bg-white text-sm"
                  >
                    {['LOW','MEDIUM','HIGH'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => { setForm(prev => ({ ...prev, subject: e.target.value })); setFieldErrors(prev => ({ ...prev, subject: undefined })); }}
                  className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.subject ? 'border-red-500' : 'border-slate-300/70'} bg-white text-sm`}
                  placeholder="Brief summary"
                />
                {fieldErrors.subject && <p className="text-xs text-red-500 mt-1">{fieldErrors.subject}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => { setForm(prev => ({ ...prev, description: e.target.value })); setFieldErrors(prev => ({ ...prev, description: undefined })); }}
                  rows={5}
                  className={`w-full mt-1 px-4 py-2.5 rounded-xl border ${fieldErrors.description ? 'border-red-500' : 'border-slate-300/70'} bg-white text-sm`}
                  placeholder="Describe the issue in detail"
                />
                {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
              </div>
              {message && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{toDisplayString(message)}</div>}
              {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{toDisplayString(error)}</div>}
              <button disabled={loading} className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">My Tickets</h3>
              {ticketsLoading ? (
                <div className="text-xs text-slate-500">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="text-xs text-slate-500">No tickets yet.</div>
              ) : (
                <ul className="space-y-3">
                  {tickets.slice(0, 5).map(ticket => (
                    <li key={ticket.id} className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-400">#{ticket.id} • {new Date(ticket.createdAt).toLocaleString()}</div>
                      <div className="text-sm font-semibold text-slate-700 mt-1">{ticket.subject}</div>
                      <div className="text-xs text-slate-500">{ticket.category} • {ticket.priority} • {ticket.status}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="font-semibold">How long does loan approval take?</div>
              <div className="text-slate-500 mt-1">Most approvals are completed within 24-48 hours.</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="font-semibold">Why is my KYC pending?</div>
              <div className="text-slate-500 mt-1">KYC verification can take up to 2 business days after document upload.</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="font-semibold">How to dispute a transaction?</div>
              <div className="text-slate-500 mt-1">Open a support ticket with the transaction ID and details.</div>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              ✅ Core banking services operational
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              ✅ Payments and transfers operational
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
              ⚠️ Loan approval processing may be delayed during weekends
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="text-sm text-slate-600">Live chat is available from 9 AM to 6 PM. Messages sent here are stored as support tickets.</div>
            <div className="mt-4 flex gap-2">
              <input
                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm"
                placeholder="Type your message"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
                onClick={async () => {
                  if (!chatMessage.trim()) return;
                  setError('');
                  setMessage('');
                  try {
                    await createSupportTicket({
                      token: user.token,
                      payload: {
                        category: 'TECHNICAL',
                        subject: 'Live Chat Message',
                        description: chatMessage,
                        priority: 'LOW'
                      }
                    });
                    setMessage('Message sent to support.');
                    setChatMessage('');
                    await loadMyTickets();
                  } catch (e) {
                    setError(e?.message || 'Failed to send message');
                  }
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SupportPage;
