import { apiFetch } from '../utils/apiClient';

export function fetchAuditLogs({ token, actorEmail, action, targetType } = {}) {
  const query = {};
  if (actorEmail) query.actorEmail = actorEmail;
  if (action) query.action = action;
  if (targetType) query.targetType = targetType;
  return apiFetch('/api/audit', { token, query });
}
