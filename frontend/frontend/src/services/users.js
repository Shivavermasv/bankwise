import { fetchUserDetailsOwned } from '../utils/apiClient';

export function getUserDetailsOwned({ token, accountNumber }) {
  return fetchUserDetailsOwned({ token, accountNumber });
}
