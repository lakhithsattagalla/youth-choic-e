const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // On any local dev port (localhost / 127.0.0.1), target backend port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBaseUrl();

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (networkError: any) {
    console.error('[API Client Network Error]:', networkError);
    throw new Error('Unable to connect to the server. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let errorMsg = data.error || data.message || data.details;

    if (!errorMsg) {
      if (response.status === 404) {
        errorMsg = "Sorry, we couldn't find what you're looking for.";
      } else if (response.status === 401) {
        errorMsg = 'Session expired or unauthorized. Please log in again.';
      } else if (response.status === 403) {
        errorMsg = 'Access denied. You do not have permission for this action.';
      } else if (response.status === 429) {
        errorMsg = 'Too many requests. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        errorMsg = 'Something went wrong. Please try again later.';
      } else {
        errorMsg = 'Request failed. Please try again later.';
      }
    }

    throw new Error(errorMsg);
  }

  return data;
}
