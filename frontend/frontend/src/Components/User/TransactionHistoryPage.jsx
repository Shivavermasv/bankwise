import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Layout/Navbar";
import { useTheme } from '../../context/ThemeContext.jsx';
import { fetchTransactions as fetchTransactionsApi, requestTransactionsPdf } from '../../services/transactions';
import { toDisplayString } from '../../utils';

const TransactionHistoryPage = () => {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const { theme } = useTheme();
  
  // State management
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    page: 0,
    size: 10,
    startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });

  // Pagination
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Fetch transactions
  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    
    try {
      const data = await fetchTransactionsApi({
        token: user.token,
        accountNumber: user.accountNumber,
        page: filters.page,
        size: filters.size,
        startDate: filters.startDate,
        endDate: filters.endDate
      });
      const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      setTransactions(list);
      setTotalPages(data?.totalPages || (list.length ? 1 : 0));
      setTotalElements(data?.totalElements || list.length || 0);
    } catch (e) {
      if (e?.status === 403) {
        setError(e.message || 'You are not authorized to access this account');
      } else {
        setError(e?.message || "Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Request PDF
  const requestPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await requestTransactionsPdf({
        token: user.token,
        accountNumber: user.accountNumber,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      if (res.ok) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3000);
      } else {
        setError("Failed to generate PDF");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 0 : value // Reset page when other filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      handleFilterChange('page', newPage);
    }
  };

  // Load transactions on component mount and filter changes
  useEffect(() => {
    if (user.accountNumber && user.token) {
      loadTransactions();
    }
  }, [filters]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get transaction type color and display info
  // Now the backend sends negative amounts for debits (outgoing), positive for credits (incoming)
  const getTransactionColor = (type, amount) => {
    // Primary: Use amount sign to determine color
    // Positive amount = credit (money in) = green
    // Negative amount = debit (money out) = red
    if (amount > 0) return '#10b981'; // Green for credits
    if (amount < 0) return '#ef4444'; // Red for debits
    return '#64748b'; // Gray for zero
  };
  
  // Get display-friendly transaction type name
  const getTransactionTypeName = (type) => {
    const typeMap = {
      'LOAN_DISBURSEMENT': 'Loan Credit',
      'LOAN_PAYMENT': 'EMI Payment',
      'LOAN_PENALTY': 'Loan Penalty',
      'DEPOSIT': 'Deposit',
      'TRANSFER': 'Transfer',
      'WITHDRAW': 'Withdrawal'
    };
    return typeMap[type] || type || 'Transaction';
  };

  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme==='dark'?'bg-slate-900':'bg-[linear-gradient(135deg,#eef7ff_0%,#f5fdfa_100%)]'}`}>
      <Navbar />
      
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "40px 20px"
      }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32
          }}
        >
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 8
            }}>
              Transaction History
            </h1>
            <p style={{
              fontSize: 16,
              color: "#64748b"
            }}>
              Account: {user.accountNumber}
            </p>
          </div>
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
              cursor: "pointer"
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Filters and PDF Button */}
        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)"
          }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1e293b",
              margin: 0
            }}>
              Filters & Export
            </h3>
            <button
              onClick={requestPDF}
              disabled={pdfLoading}
              style={{
                background: pdfSuccess ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : 
                           "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                borderRadius: 12,
                padding: "12px 24px",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: pdfLoading ? "not-allowed" : "pointer",
                opacity: pdfLoading ? 0.7 : 1,
                boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              {pdfLoading ? "📤 Generating..." : 
               pdfSuccess ? "✅ PDF Sent!" : 
               "📧 Email PDF"}
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16
          }}>
            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                marginBottom: 8
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "2px solid rgba(59,130,246,0.2)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                marginBottom: 8
              }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "2px solid rgba(59,130,246,0.2)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none"
                }}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                marginBottom: 8
              }}>
                Records per page
              </label>
              <select
                value={filters.size}
                onChange={(e) => handleFilterChange('size', parseInt(e.target.value))}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "2px solid rgba(59,130,246,0.2)",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                  background: "#fff"
                }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div style={{
              display: "flex",
              alignItems: "end"
            }}>
              <button
                onClick={() => handleFilterChange('page', 0)}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none",
                  borderRadius: 8,
                  padding: 12,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                🔍 Apply Filters
              </button>
            </div>
          </div>

          {pdfSuccess && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: 8,
                color: "#10b981",
                fontSize: 14,
                textAlign: "center"
              }}
            >
              ✅ Transaction PDF has been sent to your email address!
            </div>
          )}
        </div>

        {/* Transaction Table */}
        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)"
          }}
        >
          {/* Table Header */}
          <div style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            padding: 20,
            borderBottom: "1px solid rgba(148,163,184,0.3)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#1e293b",
                margin: 0
              }}>
                Transactions ({totalElements} total)
              </h3>
              <div style={{
                fontSize: 14,
                color: "#64748b"
              }}>
                Page {filters.page + 1} of {totalPages}
              </div>
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: "#64748b",
              fontSize: 16
            }}>
              Loading transactions...
            </div>
          ) : error ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: "#ef4444",
              fontSize: 16
            }}>
              {toDisplayString(error)}
            </div>
          ) : transactions.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
              color: "#64748b",
              fontSize: 16
            }}>
              No transactions found for the selected period
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse"
                }}>
                  <thead>
                    <tr style={{
                      background: "rgba(248,250,252,0.5)"
                    }}>
                      <th style={{
                        padding: 16,
                        textAlign: "left",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid rgba(148,163,184,0.2)"
                      }}>
                        Date & Time
                      </th>
                      <th style={{
                        padding: 16,
                        textAlign: "left",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid rgba(148,163,184,0.2)"
                      }}>
                        Description
                      </th>
                      <th style={{
                        padding: 16,
                        textAlign: "left",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid rgba(148,163,184,0.2)"
                      }}>
                        Type
                      </th>
                      <th style={{
                        padding: 16,
                        textAlign: "right",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid rgba(148,163,184,0.2)"
                      }}>
                        Amount
                      </th>
                      <th style={{
                        padding: 16,
                        textAlign: "right",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#374151",
                        borderBottom: "1px solid rgba(148,163,184,0.2)"
                      }}>
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction, index) => (
                      <tr
                        key={transaction.id || index}
                        style={{
                          borderBottom: "1px solid rgba(148,163,184,0.1)"
                        }}
                      >
                        <td style={{
                          padding: 16,
                          fontSize: 14,
                          color: "#374151"
                        }}>
                          {formatDate(transaction.date || transaction.timestamp)}
                        </td>
                        <td style={{
                          padding: 16,
                          fontSize: 14,
                          color: "#374151"
                        }}>
                          {transaction.description || transaction.narration || "Transaction"}
                        </td>
                        <td style={{
                          padding: 16,
                          fontSize: 14
                        }}>
                          <span style={{
                            padding: "4px 12px",
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 600,
                            background: getTransactionColor(transaction.type, transaction.amount) + "20",
                            color: getTransactionColor(transaction.type, transaction.amount)
                          }}>
                            {getTransactionTypeName(transaction.type)}
                          </span>
                        </td>
                        <td style={{
                          padding: 16,
                          fontSize: 16,
                          fontWeight: 600,
                          textAlign: "right",
                          color: getTransactionColor(transaction.type, transaction.amount)
                        }}>
                          {transaction.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(transaction.amount))}
                        </td>
                        <td style={{
                          padding: 16,
                          fontSize: 14,
                          fontWeight: 500,
                          textAlign: "right",
                          color: "#374151"
                        }}>
                          {formatCurrency(transaction.balance || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  padding: 20,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  borderTop: "1px solid rgba(148,163,184,0.2)"
                }}>
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={filters.page === 0}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid rgba(148,163,184,0.3)",
                      borderRadius: 8,
                      background: filters.page === 0 ? "#f8fafc" : "#fff",
                      color: filters.page === 0 ? "#94a3b8" : "#374151",
                      cursor: filters.page === 0 ? "not-allowed" : "pointer",
                      fontSize: 14
                    }}
                  >
                    ← Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(0, Math.min(totalPages - 5, filters.page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid rgba(148,163,184,0.3)",
                          borderRadius: 8,
                          background: pageNum === filters.page ? "#3b82f6" : "#fff",
                          color: pageNum === filters.page ? "#fff" : "#374151",
                          cursor: "pointer",
                          fontSize: 14,
                          minWidth: 40
                        }}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={filters.page >= totalPages - 1}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid rgba(148,163,184,0.3)",
                      borderRadius: 8,
                      background: filters.page >= totalPages - 1 ? "#f8fafc" : "#fff",
                      color: filters.page >= totalPages - 1 ? "#94a3b8" : "#374151",
                      cursor: filters.page >= totalPages - 1 ? "not-allowed" : "pointer",
                      fontSize: 14
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionHistoryPage;
