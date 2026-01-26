/**
 * Banking API Services
 * Handles API calls for beneficiaries, cards, scheduled payments, 
 * transaction PIN, user analytics, and EMI management
 */

import { apiFetch, invalidateCache } from './apiClient';

// ===== BENEFICIARY MANAGEMENT =====

export const beneficiaryApi = {
  /**
   * Get all beneficiaries for the current user
   */
  async getAll(token) {
    return apiFetch('/api/beneficiaries', { token });
  },

  /**
   * Get favorite beneficiaries
   */
  async getFavorites(token) {
    return apiFetch('/api/beneficiaries/favorites', { token });
  },

  /**
   * Search beneficiaries by account number or nickname
   */
  async search(token, query) {
    return apiFetch('/api/beneficiaries/search', { 
      token, 
      query: { query } 
    });
  },

  /**
   * Add a new beneficiary
   */
  async add(token, { accountNumber, nickname }) {
    const result = await apiFetch('/api/beneficiaries', {
      method: 'POST',
      token,
      body: { accountNumber, nickname }
    });
    invalidateCache('/api/beneficiaries');
    return result;
  },

  /**
   * Update beneficiary details
   */
  async update(token, id, { nickname, isFavorite }) {
    const result = await apiFetch(`/api/beneficiaries/${id}`, {
      method: 'PUT',
      token,
      body: { nickname, isFavorite }
    });
    invalidateCache('/api/beneficiaries');
    return result;
  },

  /**
   * Delete a beneficiary
   */
  async delete(token, id) {
    const result = await apiFetch(`/api/beneficiaries/${id}`, {
      method: 'DELETE',
      token
    });
    invalidateCache('/api/beneficiaries');
    return result;
  },

  /**
   * Record a transfer to beneficiary (updates last transfer date)
   */
  async recordTransfer(token, accountNumber) {
    return apiFetch('/api/beneficiaries/record-transfer', {
      method: 'POST',
      token,
      body: { accountNumber }
    });
  }
};

// ===== CARD MANAGEMENT =====

export const cardApi = {
  /**
   * Get all cards for the current user
   */
  async getAll(token) {
    return apiFetch('/api/cards', { token });
  },

  /**
   * Get active cards only
   */
  async getActive(token) {
    return apiFetch('/api/cards/active', { token });
  },

  /**
   * Get card details
   */
  async getDetails(token, cardId, showSensitive = false) {
    return apiFetch(`/api/cards/${cardId}`, {
      token,
      query: { showSensitive }
    });
  },

  /**
   * Issue a new debit card
   */
  async issueDebitCard(token, accountId) {
    const result = await apiFetch('/api/cards/issue/debit', {
      method: 'POST',
      token,
      body: { accountId }
    });
    invalidateCache('/api/cards');
    return result;
  },

  /**
   * Issue a new credit card with requested limit
   */
  async issueCreditCard(token, accountId, requestedLimit) {
    const result = await apiFetch('/api/cards/issue/credit', {
      method: 'POST',
      token,
      body: { accountId, requestedLimit }
    });
    invalidateCache('/api/cards');
    return result;
  },

  /**
   * Block a card
   */
  async block(token, cardId) {
    const result = await apiFetch(`/api/cards/${cardId}/block`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/cards');
    return result;
  },

  /**
   * Unblock a card
   */
  async unblock(token, cardId) {
    const result = await apiFetch(`/api/cards/${cardId}/unblock`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/cards');
    return result;
  },

  /**
   * Update card settings
   */
  async updateSettings(token, cardId, settings) {
    const result = await apiFetch(`/api/cards/${cardId}/settings`, {
      method: 'PUT',
      token,
      body: settings
    });
    invalidateCache('/api/cards');
    return result;
  }
};

// ===== SCHEDULED PAYMENTS =====

export const scheduledPaymentApi = {
  /**
   * Get all scheduled payments
   */
  async getAll(token) {
    return apiFetch('/api/scheduled-payments', { token });
  },

  /**
   * Get active scheduled payments only
   */
  async getActive(token) {
    return apiFetch('/api/scheduled-payments/active', { token });
  },

  /**
   * Get upcoming payments (due within N days)
   */
  async getUpcoming(token, days = 7) {
    return apiFetch('/api/scheduled-payments/upcoming', {
      token,
      query: { days }
    });
  },

  /**
   * Create a new scheduled payment
   */
  async create(token, paymentData) {
    const result = await apiFetch('/api/scheduled-payments', {
      method: 'POST',
      token,
      body: paymentData
    });
    invalidateCache('/api/scheduled-payments');
    return result;
  },

  /**
   * Update scheduled payment
   */
  async update(token, id, paymentData) {
    const result = await apiFetch(`/api/scheduled-payments/${id}`, {
      method: 'PUT',
      token,
      body: paymentData
    });
    invalidateCache('/api/scheduled-payments');
    return result;
  },

  /**
   * Pause a scheduled payment
   */
  async pause(token, id) {
    const result = await apiFetch(`/api/scheduled-payments/${id}/pause`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/scheduled-payments');
    return result;
  },

  /**
   * Resume a paused scheduled payment
   */
  async resume(token, id) {
    const result = await apiFetch(`/api/scheduled-payments/${id}/resume`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/scheduled-payments');
    return result;
  },

  /**
   * Cancel a scheduled payment
   */
  async cancel(token, id) {
    const result = await apiFetch(`/api/scheduled-payments/${id}/cancel`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/scheduled-payments');
    return result;
  }
};

// ===== TRANSACTION PIN =====

export const transactionPinApi = {
  /**
   * Check if user has PIN set up
   */
  async hasPin(token) {
    return apiFetch('/api/transaction-pin/status', { token });
  },

  /**
   * Set up a new transaction PIN
   */
  async setup(token, pin) {
    return apiFetch('/api/transaction-pin/setup', {
      method: 'POST',
      token,
      body: { pin }
    });
  },

  /**
   * Verify transaction PIN
   */
  async verify(token, pin) {
    return apiFetch('/api/transaction-pin/verify', {
      method: 'POST',
      token,
      body: { pin }
    });
  },

  /**
   * Initiate forgot PIN flow (sends OTP)
   */
  async forgotPin(token) {
    return apiFetch('/api/transaction-pin/forgot', {
      method: 'POST',
      token
    });
  },

  /**
   * Reset PIN with OTP verification
   */
  async reset(token, otp, newPin) {
    return apiFetch('/api/transaction-pin/reset', {
      method: 'POST',
      token,
      body: { otp, newPin }
    });
  },

  /**
   * Change PIN (requires current PIN)
   */
  async change(token, currentPin, newPin) {
    return apiFetch('/api/transaction-pin/change', {
      method: 'POST',
      token,
      body: { currentPin, newPin }
    });
  }
};

// ===== USER ANALYTICS =====

export const analyticsApi = {
  /**
   * Get dashboard summary
   */
  async getDashboard(token) {
    return apiFetch('/api/analytics/dashboard', { token });
  },

  /**
   * Get spending analytics
   */
  async getSpending(token, months = 6) {
    return apiFetch('/api/analytics/spending', {
      token,
      query: { months }
    });
  },

  /**
   * Get loan analytics (EMI history, repayments)
   */
  async getLoans(token) {
    return apiFetch('/api/analytics/loans', { token });
  },

  /**
   * Get all debts summary
   */
  async getDebts(token) {
    return apiFetch('/api/analytics/debts', { token });
  },

  /**
   * Get monthly summary (income vs expense)
   */
  async getMonthlySummary(token, year, month) {
    return apiFetch('/api/analytics/monthly-summary', {
      token,
      query: { year, month }
    });
  }
};

// ===== EMI MANAGEMENT =====

export const emiApi = {
  /**
   * Get EMI schedule for a loan
   */
  async getSchedule(token, loanId) {
    return apiFetch(`/api/emi/schedule/${loanId}`, { token });
  },

  /**
   * Pay EMI manually (early payment)
   */
  async payManually(token, loanId) {
    const result = await apiFetch(`/api/emi/pay/${loanId}`, {
      method: 'POST',
      token
    });
    invalidateCache('/api/emi');
    invalidateCache('/api/analytics');
    return result;
  },

  /**
   * Toggle auto-debit for a loan
   */
  async toggleAutoDebit(token, loanId, enabled) {
    const result = await apiFetch(`/api/emi/auto-debit/${loanId}`, {
      method: 'POST',
      token,
      query: { enabled }
    });
    invalidateCache('/api/emi');
    return result;
  },

  /**
   * Get EMI details for a specific loan
   */
  async getDetails(token, loanId) {
    return apiFetch(`/api/emi/details/${loanId}`, { token });
  },

  /**
   * Get all loans with EMI information
   */
  async getAllLoans(token) {
    return apiFetch('/api/emi/loans', { token });
  },

  /**
   * Update EMI day of month preference
   */
  async updateEmiDay(token, loanId, dayOfMonth) {
    const result = await apiFetch(`/api/emi/emi-day/${loanId}`, {
      method: 'PUT',
      token,
      query: { dayOfMonth }
    });
    invalidateCache('/api/emi');
    return result;
  }
};

export default {
  beneficiary: beneficiaryApi,
  card: cardApi,
  scheduledPayment: scheduledPaymentApi,
  transactionPin: transactionPinApi,
  analytics: analyticsApi,
  emi: emiApi
};
