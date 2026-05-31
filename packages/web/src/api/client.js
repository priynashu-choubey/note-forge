const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE;
    this.accessToken = localStorage.getItem('noteforge_access_token');
    this.refreshToken = localStorage.getItem('noteforge_refresh_token');
    this.onAuthError = null;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (accessToken) {
      localStorage.setItem('noteforge_access_token', accessToken);
    } else {
      localStorage.removeItem('noteforge_access_token');
    }
    if (refreshToken) {
      localStorage.setItem('noteforge_refresh_token', refreshToken);
    } else {
      localStorage.removeItem('noteforge_refresh_token');
    }
  }

  clearTokens() {
    this.setTokens(null, null);
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...options.headers };

    if (this.accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body instanceof FormData
        ? options.body
        : options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle token expiry — try refresh
    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data.code === 'TOKEN_EXPIRED' && this.refreshToken) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            body: options.body instanceof FormData
              ? options.body
              : options.body ? JSON.stringify(options.body) : undefined,
          });
          if (retryResponse.ok) {
            return retryResponse.status === 204 ? null : retryResponse.json();
          }
        }
        // Refresh failed — force logout
        this.clearTokens();
        this.onAuthError?.();
        throw new Error('Session expired');
      }
      this.clearTokens();
      this.onAuthError?.();
      throw new Error(data.error || 'Unauthorized');
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async tryRefresh() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: { email, password, name },
      skipAuth: true,
    });
  }

  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    });
  }

  logout() {
    return this.request('/auth/logout', {
      method: 'POST',
      body: { refreshToken: this.refreshToken },
    }).finally(() => this.clearTokens());
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Notes
  getNotes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/notes${qs ? `?${qs}` : ''}`);
  }

  getNote(id) {
    return this.request(`/notes/${id}`);
  }

  createNote(data) {
    return this.request('/notes', { method: 'POST', body: data });
  }

  updateNote(id, data) {
    return this.request(`/notes/${id}`, { method: 'PUT', body: data });
  }

  deleteNote(id) {
    return this.request(`/notes/${id}`, { method: 'DELETE' });
  }

  searchNotes(q) {
    return this.request(`/notes/search?q=${encodeURIComponent(q)}`);
  }

  syncNotes(changes, lastSyncAt) {
    return this.request('/notes/sync', {
      method: 'POST',
      body: { changes, lastSyncAt },
    });
  }

  // Folders
  getFolders() {
    return this.request('/folders');
  }

  createFolder(data) {
    return this.request('/folders', { method: 'POST', body: data });
  }

  updateFolder(id, data) {
    return this.request(`/folders/${id}`, { method: 'PUT', body: data });
  }

  deleteFolder(id) {
    return this.request(`/folders/${id}`, { method: 'DELETE' });
  }

  // Media
  uploadFile(file, noteId) {
    const formData = new FormData();
    formData.append('file', file);
    if (noteId) formData.append('noteId', noteId);
    return this.request('/media/upload', { method: 'POST', body: formData });
  }

  getFileUrl(id) {
    return `${this.baseUrl}/media/${id}`;
  }

  getThumbnailUrl(id) {
    return `${this.baseUrl}/media/${id}/thumbnail`;
  }

  getAttachments(noteId) {
    return this.request(`/media/note/${noteId}`);
  }

  deleteAttachment(id) {
    return this.request(`/media/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
