// ============================================================
// Central runtime config for the frontend.
// Reads Vite env vars (VITE_*) with safe fallbacks so behaviour
// is unchanged even without a .env file. Do NOT hardcode the API
// origin/port elsewhere — import from here instead.
//   Vite exposes only vars prefixed with VITE_ via import.meta.env.
// ============================================================

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://127.0.0.1:5286';

// Origin (scheme + host + port), no trailing slash. Used for static files.
export const API_ORIGIN_URL = API_ORIGIN;

// REST API base, e.g. http://localhost:5286/api/v1
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${API_ORIGIN}/api/v1`;

// SignalR hubs
export const CHAT_HUB_URL =
  import.meta.env.VITE_CHAT_HUB_URL || `${API_ORIGIN}/hubs/chat`;

export const NOTIFICATION_HUB_URL =
  import.meta.env.VITE_NOTIFICATION_HUB_URL || `${API_ORIGIN}/hubs/notification`;
