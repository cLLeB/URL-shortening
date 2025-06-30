import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Url,
  CreateUrlData,
  UpdateUrlData,
  UrlAnalytics,
  UserAnalytics,
  UserStats,
  UserSession,
  UserActivity,
  ClickData,
  UrlFilters,
  AnalyticsFilters,
  ApiResponse,
  ApiError,
  Pagination,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              const { accessToken } = response.tokens;

              localStorage.setItem('accessToken', accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;

              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const { data, status } = error.response;
      return {
        success: false,
        message: (data as any)?.message || 'An error occurred',
        error: (data as any)?.error,
        errors: (data as any)?.errors,
        status,
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0,
      };
    } else {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    const { tokens } = response.data;

    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', data);
    const { tokens } = response.data;

    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/refresh', {
      refreshToken,
    });

    const { tokens } = response.data;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      await this.api.post('/auth/logout', { refreshToken });
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async getProfile(): Promise<User> {
    const response: AxiosResponse<{ user: User }> = await this.api.get('/auth/profile');
    return response.data.user;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response: AxiosResponse<{ user: User }> = await this.api.put('/auth/profile', data);
    return response.data.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  // URL methods
  async createUrl(data: CreateUrlData): Promise<Url> {
    const response: AxiosResponse<{ url: Url }> = await this.api.post('/urls', data);
    return response.data.url;
  }

  async getUrls(filters: UrlFilters = {}): Promise<{ urls: Url[]; pagination: Pagination }> {
    const response: AxiosResponse<{ urls: Url[]; pagination: Pagination }> = await this.api.get(
      '/urls',
      {
        params: filters,
      }
    );
    return response.data;
  }

  async getUrl(id: string): Promise<Url> {
    const response: AxiosResponse<{ url: Url }> = await this.api.get(`/urls/${id}`);
    return response.data.url;
  }

  async updateUrl(id: string, data: UpdateUrlData): Promise<Url> {
    const response: AxiosResponse<{ url: Url }> = await this.api.put(`/urls/${id}`, data);
    return response.data.url;
  }

  async deleteUrl(id: string): Promise<void> {
    await this.api.delete(`/urls/${id}`);
  }

  // Analytics methods
  async getUserAnalytics(timeRange: string = '30d'): Promise<UserAnalytics> {
    const response: AxiosResponse<{ analytics: UserAnalytics }> = await this.api.get(
      '/analytics/overview',
      {
        params: { timeRange },
      }
    );
    return response.data.analytics;
  }

  async getUrlAnalytics(urlId: string, timeRange: string = '30d'): Promise<UrlAnalytics> {
    const response: AxiosResponse<{ analytics: UrlAnalytics }> = await this.api.get(
      `/analytics/urls/${urlId}`,
      {
        params: { timeRange },
      }
    );
    return response.data.analytics;
  }

  async getUrlClicks(urlId: string, limit: number = 20): Promise<ClickData[]> {
    const response: AxiosResponse<{ clicks: ClickData[] }> = await this.api.get(
      `/analytics/urls/${urlId}/clicks`,
      {
        params: { limit },
      }
    );
    return response.data.clicks;
  }

  async getTopUrls(filters: AnalyticsFilters = {}): Promise<Url[]> {
    const response: AxiosResponse<{ topUrls: Url[] }> = await this.api.get('/analytics/top-urls', {
      params: filters,
    });
    return response.data.topUrls;
  }

  async exportAnalytics(
    urlId: string,
    format: 'json' | 'csv' = 'json',
    timeRange: string = '30d'
  ): Promise<Blob> {
    const response = await this.api.get(`/analytics/export/${urlId}`, {
      params: { format, timeRange },
      responseType: 'blob',
    });
    return response.data;
  }

  // User methods
  async getUserStats(): Promise<UserStats> {
    const response: AxiosResponse<{ stats: UserStats }> = await this.api.get('/users/stats');
    return response.data.stats;
  }

  async getUserSessions(): Promise<UserSession[]> {
    const response: AxiosResponse<{ sessions: UserSession[] }> =
      await this.api.get('/users/sessions');
    return response.data.sessions;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.api.delete(`/users/sessions/${sessionId}`);
  }

  async getUserActivity(limit: number = 20): Promise<UserActivity[]> {
    const response: AxiosResponse<{ activities: UserActivity[] }> = await this.api.get(
      '/users/activity',
      {
        params: { limit },
      }
    );
    return response.data.activities;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // URL preview method (for public URLs)
  async getUrlPreview(shortCode: string): Promise<Partial<Url>> {
    const response: AxiosResponse<{ url: Partial<Url> }> = await axios.get(
      `${this.baseURL.replace('/api', '')}/${shortCode}?preview=true`
    );
    return response.data.url;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await axios.get(`${this.baseURL.replace('/api', '')}/health`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
