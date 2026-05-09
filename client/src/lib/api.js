const API_BASE_URL = '/api';

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

async function fetchWithAuth(url, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 403 || response.status === 401) {
    // Try to refresh token
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new token
      headers['Authorization'] = `Bearer ${accessToken}`;
      return fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  return response;
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  clearAccessToken();
}

export async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    return true;
  } catch (err) {
    return false;
  }
}

export const api = {
  // Jobs
  async getJobs() {
    const response = await fetchWithAuth('/jobs');
    if (!response.ok) throw new Error('Failed to fetch jobs');
    return response.json();
  },

  async getJob(id) {
    const response = await fetchWithAuth(`/jobs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch job');
    return response.json();
  },

  async createJob(data) {
    const response = await fetchWithAuth('/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create job');
    return response.json();
  },

  async cancelJob(id) {
    const response = await fetchWithAuth(`/jobs/${id}/cancel`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to cancel job');
    return response.json();
  },

  async deleteJob(id) {
    const response = await fetchWithAuth(`/jobs/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete job');
    return response.json();
  },

  // Files
  async getFiles(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetchWithAuth(`/files?${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch files');
    return response.json();
  },

  async getFile(id) {
    const response = await fetchWithAuth(`/files/${id}`);
    if (!response.ok) throw new Error('Failed to fetch file');
    return response.json();
  },

  // Upload
  async initUpload(data) {
    const response = await fetchWithAuth('/upload/init', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to init upload');
    return response.json();
  },

  async uploadChunk(sessionId, chunkIndex, chunkData) {
    const response = await fetchWithAuth(`/upload/${sessionId}/chunk/${chunkIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: chunkData,
    });
    if (!response.ok) throw new Error('Failed to upload chunk');
    return response.json();
  },

  async completeUpload(sessionId) {
    const response = await fetchWithAuth(`/upload/${sessionId}/complete`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to complete upload');
    return response.json();
  },

  async transferToStorage(sessionId) {
    const response = await fetchWithAuth(`/storage/transfer/${sessionId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to transfer to storage');
    return response.json();
  },

  // Admin
  async getUsers() {
    const response = await fetchWithAuth('/admin/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(data) {
    const response = await fetchWithAuth('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  async updateUser(id, data) {
    const response = await fetchWithAuth(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  async deactivateUser(id) {
    const response = await fetchWithAuth(`/admin/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to deactivate user');
    return response.json();
  },

  async getUserFiles(id) {
    const response = await fetchWithAuth(`/admin/users/${id}/files`);
    if (!response.ok) throw new Error('Failed to fetch user files');
    return response.json();
  },

  async getStats() {
    const response = await fetchWithAuth('/admin/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
};
