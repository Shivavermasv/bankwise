import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { beneficiaryApi } from '../../utils/bankingApi';
import { FiUser, FiStar, FiSearch, FiPlus, FiEdit2, FiTrash2, FiClock, FiSend } from 'react-icons/fi';
import Navbar from '../Layout/Navbar';
import { useTheme } from '../../context/ThemeContext';

const BeneficiaryManagement = ({ onSelectBeneficiary, showSelectMode = false, embedded = false }) => {
  const { token, isLoading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'favorites' | 'recent'

  const loadBeneficiaries = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [allData, favData] = await Promise.all([
        beneficiaryApi.getAll(token),
        beneficiaryApi.getFavorites(token)
      ]);
      setBeneficiaries(allData || []);
      setFavorites(favData || []);
    } catch (err) {
      setError(err.message || 'Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      loadBeneficiaries();
    }
  }, [loadBeneficiaries, authLoading, token]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const results = await beneficiaryApi.search(token, query);
        setBeneficiaries(results || []);
      } catch (err) {
        console.error('Search failed:', err);
      }
    } else if (query.length === 0) {
      loadBeneficiaries();
    }
  };

  const handleToggleFavorite = async (beneficiary) => {
    try {
      await beneficiaryApi.update(token, beneficiary.id, {
        nickname: beneficiary.nickname,
        isFavorite: !beneficiary.isFavorite
      });
      loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to update favorite status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this beneficiary?')) return;
    try {
      await beneficiaryApi.delete(token, id);
      loadBeneficiaries();
    } catch (err) {
      setError(err.message || 'Failed to delete beneficiary');
    }
  };

  const handleSelect = (beneficiary) => {
    if (onSelectBeneficiary) {
      onSelectBeneficiary(beneficiary);
    }
  };

  const getFilteredBeneficiaries = () => {
    let filtered = beneficiaries;
    switch (activeTab) {
      case 'favorites':
        filtered = favorites;
        break;
      case 'recent':
        filtered = [...beneficiaries]
          .filter(b => b.lastTransferDate)
          .sort((a, b) => new Date(b.lastTransferDate) - new Date(a.lastTransferDate));
        break;
      default:
        break;
    }
    return filtered;
  };

  const displayList = getFilteredBeneficiaries();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Beneficiaries
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FiPlus className="w-4 h-4" />
            Add New
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or account number..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'all', label: 'All', icon: FiUser },
            { id: 'favorites', label: 'Favorites', icon: FiStar },
            { id: 'recent', label: 'Recent', icon: FiClock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Beneficiary List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
        {displayList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FiUser className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No beneficiaries found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Add your first beneficiary
            </button>
          </div>
        ) : (
          displayList.map((beneficiary) => (
            <div
              key={beneficiary.id}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                showSelectMode ? 'cursor-pointer' : ''
              }`}
              onClick={() => showSelectMode && handleSelect(beneficiary)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {beneficiary.beneficiaryName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {beneficiary.nickname || beneficiary.beneficiaryName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {beneficiary.accountNumber}
                    </p>
                    {beneficiary.lastTransferDate && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Last transfer: {new Date(beneficiary.lastTransferDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showSelectMode ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(beneficiary);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Send money"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleFavorite(beneficiary)}
                        className={`p-2 rounded-lg transition-colors ${
                          beneficiary.isFavorite
                            ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={beneficiary.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <FiStar className={`w-4 h-4 ${beneficiary.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => setEditingBeneficiary(beneficiary)}
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(beneficiary.id)}
                        className="p-2 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingBeneficiary) && (
        <BeneficiaryModal
          beneficiary={editingBeneficiary}
          onClose={() => {
            setShowAddModal(false);
            setEditingBeneficiary(null);
          }}
          onSave={() => {
            loadBeneficiaries();
            setShowAddModal(false);
            setEditingBeneficiary(null);
          }}
          token={token}
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
      <div className="max-w-4xl mx-auto pt-6">
        {content}
      </div>
    </div>
  );
};

// Beneficiary Add/Edit Modal
const BeneficiaryModal = ({ beneficiary, onClose, onSave, token }) => {
  const [formData, setFormData] = useState({
    accountNumber: beneficiary?.accountNumber || '',
    nickname: beneficiary?.nickname || '',
    isFavorite: beneficiary?.isFavorite || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (beneficiary) {
        await beneficiaryApi.update(token, beneficiary.id, {
          nickname: formData.nickname,
          isFavorite: formData.isFavorite
        });
      } else {
        await beneficiaryApi.add(token, {
          accountNumber: formData.accountNumber,
          nickname: formData.nickname
        });
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save beneficiary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {beneficiary ? 'Edit Beneficiary' : 'Add Beneficiary'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!beneficiary && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Enter account number"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nickname (Optional)
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Mom, John's Account"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFavorite"
              checked={formData.isFavorite}
              onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isFavorite" className="text-sm text-gray-700 dark:text-gray-300">
              Add to favorites
            </label>
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
              {loading ? 'Saving...' : (beneficiary ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BeneficiaryManagement;
