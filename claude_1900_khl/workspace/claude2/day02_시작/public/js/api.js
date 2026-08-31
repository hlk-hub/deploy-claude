const API_BASE_URL = 'http://localhost:8000/api';

class APIClient {
  static async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json().catch(() => ({}));
  }

  // Posts
  static async getPosts() {
    const response = await fetch(`${API_BASE_URL}/posts`);
    return this.handleResponse(response);
  }

  static async getPost(id) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`);
    return this.handleResponse(response);
  }

  static async createPost(data) {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async updatePost(id, data) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async deletePost(id) {
    const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
      method: 'DELETE',
    });
    return this.handleResponse(response);
  }

  // Comments
  static async getComments(postId) {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
    return this.handleResponse(response);
  }

  static async createComment(postId, data) {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async deleteComment(id) {
    const response = await fetch(`${API_BASE_URL}/comments/${id}`, {
      method: 'DELETE',
    });
    return this.handleResponse(response);
  }
}
