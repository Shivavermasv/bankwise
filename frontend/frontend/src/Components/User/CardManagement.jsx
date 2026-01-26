import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { cardApi } from '../../utils/bankingApi';
import { 
  FiCreditCard, FiLock, FiUnlock, FiSettings, FiPlus, 
  FiGlobe, FiWifi, FiShoppingCart, FiEye, FiEyeOff,
  FiAlertCircle, FiCheck
} from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';

const CardManagement = ({ embedded = false }) => {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [revealedCards, setRevealedCards] = useState(new Set());

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cardApi.getAll(token);
      setCards(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleBlockCard = async (cardId) => {
    try {
      await cardApi.block(token, cardId);
      loadCards();
    } catch (err) {
      setError(err.message || 'Failed to block card');
    }
  };

  const handleUnblockCard = async (cardId) => {
    try {
      await cardApi.unblock(token, cardId);
      loadCards();
    } catch (err) {
      setError(err.message || 'Failed to unblock card');
    }
  };

  const toggleReveal = async (cardId) => {
    if (revealedCards.has(cardId)) {
      setRevealedCards(prev => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    } else {
      try {
        const details = await cardApi.getDetails(token, cardId, true);
        setCards(prev => prev.map(card => 
          card.id === cardId ? { ...card, ...details } : card
        ));
        setRevealedCards(prev => new Set([...prev, cardId]));
        // Auto-hide after 30 seconds
        setTimeout(() => {
          setRevealedCards(prev => {
            const next = new Set(prev);
            next.delete(cardId);
            return next;
          });
        }, 30000);
      } catch (err) {
        setError(err.message || 'Failed to reveal card details');
      }
    }
  };

  const formatCardNumber = (number, revealed) => {
    if (!number) return '•••• •••• •••• ••••';
    if (revealed) {
      return number.replace(/(.{4})/g, '$1 ').trim();
    }
    return `•••• •••• •••• ${number.slice(-4)}`;
  };

  const formatExpiry = (date) => {
    if (!date) return '••/••';
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          My Cards
        </h2>
        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          Request New Card
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <FiCreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Cards Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Request your first debit or credit card
          </p>
          <button
            onClick={() => setShowIssueModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Request Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((card) => (
            <VirtualCard
              key={card.id}
              card={card}
              user={user}
              isRevealed={revealedCards.has(card.id)}
              onToggleReveal={() => toggleReveal(card.id)}
              onBlock={() => handleBlockCard(card.id)}
              onUnblock={() => handleUnblockCard(card.id)}
              onSettings={() => {
                setSelectedCard(card);
                setShowSettingsModal(true);
              }}
              formatCardNumber={formatCardNumber}
              formatExpiry={formatExpiry}
            />
          ))}
        </div>
      )}

      {/* Issue Card Modal */}
      {showIssueModal && (
        <IssueCardModal
          token={token}
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => {
            loadCards();
            setShowIssueModal(false);
          }}
        />
      )}

      {/* Card Settings Modal */}
      {showSettingsModal && selectedCard && (
        <CardSettingsModal
          card={selectedCard}
          token={token}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedCard(null);
          }}
          onSuccess={() => {
            loadCards();
            setShowSettingsModal(false);
            setSelectedCard(null);
          }}
        />
      )}
    </div>
  );

  // If embedded, just return the content
  if (embedded) {
    return content;
  }

  // Otherwise, wrap with page layout
  return (
    <div className={`min-h-screen pt-16 px-4 pb-10 ${theme === 'dark' ? 'bg-slate-900' : 'bg-[linear-gradient(135deg,#f0fdfa_0%,#e0e7ff_100%)]'}`}>
      <Navbar />
      <div className="max-w-6xl mx-auto pt-6">
        {content}
      </div>
    </div>
  );
};

// Virtual Card Component
const VirtualCard = ({ 
  card, user, isRevealed, onToggleReveal, 
  onBlock, onUnblock, onSettings, formatCardNumber, formatExpiry 
}) => {
  const isDebit = card.cardType === 'DEBIT';
  const isBlocked = card.status === 'BLOCKED';
  const isExpired = card.status === 'EXPIRED';
  
  const gradients = {
    DEBIT: 'from-blue-600 via-blue-700 to-blue-800',
    CREDIT: 'from-purple-600 via-purple-700 to-indigo-800'
  };

  return (
    <div className="space-y-4">
      {/* Card Visual */}
      <div className={`relative w-full aspect-[1.586/1] max-w-[400px] rounded-2xl p-6 bg-gradient-to-br ${gradients[card.cardType] || gradients.DEBIT} shadow-xl overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-white" />
        </div>

        {/* Card Content */}
        <div className="relative h-full flex flex-col justify-between text-white">
          {/* Top Row */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-75">BankWise</p>
              <p className="text-sm font-medium">{isDebit ? 'Debit Card' : 'Credit Card'}</p>
            </div>
            <div className="flex items-center gap-2">
              {isBlocked && (
                <span className="px-2 py-0.5 bg-red-500/80 rounded text-xs font-medium">
                  BLOCKED
                </span>
              )}
              {isExpired && (
                <span className="px-2 py-0.5 bg-orange-500/80 rounded text-xs font-medium">
                  EXPIRED
                </span>
              )}
              <FiWifi className="w-6 h-6 opacity-75 rotate-90" />
            </div>
          </div>

          {/* Chip */}
          <div className="w-12 h-9 rounded bg-yellow-400/80 shadow-inner" />

          {/* Card Number */}
          <div className="flex items-center justify-between">
            <p className="text-xl font-mono tracking-wider">
              {formatCardNumber(card.cardNumber, isRevealed)}
            </p>
            <button
              onClick={onToggleReveal}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isRevealed ? 'Hide details' : 'Show details'}
            >
              {isRevealed ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Row */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs opacity-75 mb-0.5">CARD HOLDER</p>
              <p className="font-medium tracking-wide">
                {user?.firstName?.toUpperCase()} {user?.lastName?.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75 mb-0.5">VALID THRU</p>
              <p className="font-medium">{formatExpiry(card.expiryDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75 mb-0.5">CVV</p>
              <p className="font-medium">{isRevealed ? card.cvv : '•••'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {isBlocked ? (
          <button
            onClick={onUnblock}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            <FiUnlock className="w-4 h-4" />
            Unblock Card
          </button>
        ) : (
          <button
            onClick={onBlock}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <FiLock className="w-4 h-4" />
            Block Card
          </button>
        )}
        <button
          onClick={onSettings}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <FiSettings className="w-4 h-4" />
          Settings
        </button>

        {/* Card Info Pills */}
        <div className="flex items-center gap-2 ml-auto">
          {card.internationalEnabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              <FiGlobe className="w-3 h-3" /> Intl
            </span>
          )}
          {card.onlineEnabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
              <FiShoppingCart className="w-3 h-3" /> Online
            </span>
          )}
          {card.contactlessEnabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
              <FiWifi className="w-3 h-3" /> Tap
            </span>
          )}
        </div>
      </div>

      {/* Card Limits */}
      {card.dailyLimit && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Daily Limit: ₹{card.dailyLimit.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// Issue Card Modal
const IssueCardModal = ({ token, onClose, onSuccess }) => {
  const [cardType, setCardType] = useState('DEBIT');
  const [accountId, setAccountId] = useState('');
  const [creditLimit, setCreditLimit] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (cardType === 'DEBIT') {
        await cardApi.issueDebitCard(token, accountId);
      } else {
        await cardApi.issueCreditCard(token, accountId, creditLimit);
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to request card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Request New Card
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Type
            </label>
            <div className="flex gap-4">
              {['DEBIT', 'CREDIT'].map(type => (
                <label key={type} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="cardType"
                    value={type}
                    checked={cardType === type}
                    onChange={() => setCardType(type)}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg text-center transition-all ${
                    cardType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <FiCreditCard className={`w-8 h-8 mx-auto mb-2 ${
                      cardType === type ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <p className={`font-medium ${
                      cardType === type 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {type} Card
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your account ID"
              required
            />
          </div>

          {cardType === 'CREDIT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requested Credit Limit
              </label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                min={10000}
                max={500000}
                step={10000}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Final limit subject to approval
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Requesting...' : 'Request Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Card Settings Modal
const CardSettingsModal = ({ card, token, onClose, onSuccess }) => {
  const [settings, setSettings] = useState({
    internationalEnabled: card.internationalEnabled || false,
    onlineEnabled: card.onlineEnabled || false,
    contactlessEnabled: card.contactlessEnabled || false,
    dailyLimit: card.dailyLimit || 50000
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await cardApi.updateSettings(token, card.id, settings);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const toggles = [
    { key: 'internationalEnabled', label: 'International Transactions', icon: FiGlobe },
    { key: 'onlineEnabled', label: 'Online Transactions', icon: FiShoppingCart },
    { key: 'contactlessEnabled', label: 'Contactless Payments', icon: FiWifi }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Card Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            •••• {card.cardNumber?.slice(-4)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {toggles.map(toggle => (
            <label key={toggle.key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <toggle.icon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-900 dark:text-white">{toggle.label}</span>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${
                settings[toggle.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={settings[toggle.key]}
                  onChange={(e) => setSettings({ ...settings, [toggle.key]: e.target.checked })}
                  className="sr-only"
                />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings[toggle.key] ? 'translate-x-5' : ''
                }`}>
                  {settings[toggle.key] && <FiCheck className="w-3 h-3 m-1 text-blue-600" />}
                </div>
              </div>
            </label>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Daily Limit (₹)
            </label>
            <input
              type="number"
              value={settings.dailyLimit}
              onChange={(e) => setSettings({ ...settings, dailyLimit: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              min={5000}
              max={500000}
              step={5000}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CardManagement;
