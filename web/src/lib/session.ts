// Generate a random session key
const generateSessionKey = () => {
  return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session key
export const getOrCreateSessionKey = (): string => {
  const STORAGE_KEY = "tourify_session_key";
  let sessionKey = localStorage.getItem(STORAGE_KEY);

  if (!sessionKey) {
    sessionKey = generateSessionKey();
    localStorage.setItem(STORAGE_KEY, sessionKey);
  }

  return sessionKey;
};

export const deleteSessionKey = () => {
  const STORAGE_KEY = "tourify_session_key";
  localStorage.removeItem(STORAGE_KEY);
};
