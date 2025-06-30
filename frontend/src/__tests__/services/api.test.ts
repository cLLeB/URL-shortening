import axios from 'axios';
import { apiService } from '../../services/api';
import { LoginCredentials, RegisterData } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
};

mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication', () => {
    describe('login', () => {
      it('should login successfully and store tokens', async () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        const mockResponse = {
          data: {
            success: true,
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            },
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
            },
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.login(credentials);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials);
        expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
        expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle login error', async () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'wrong-password',
        };

        const mockError = {
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid credentials',
            },
          },
        };

        mockAxiosInstance.post.mockRejectedValue(mockError);

        await expect(apiService.login(credentials)).rejects.toEqual({
          success: false,
          message: 'Invalid credentials',
          status: 401,
        });
      });
    });

    describe('register', () => {
      it('should register successfully and store tokens', async () => {
        const registerData: RegisterData = {
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        };

        const mockResponse = {
          data: {
            success: true,
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            },
            tokens: {
              accessToken: 'access-token',
              refreshToken: 'refresh-token',
            },
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.register(registerData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', registerData);
        expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'access-token');
        expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token');
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('logout', () => {
      it('should logout and clear tokens', async () => {
        localStorage.setItem('refreshToken', 'refresh-token');

        mockAxiosInstance.post.mockResolvedValue({ data: { success: true } });

        await apiService.logout();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout', {
          refreshToken: 'refresh-token',
        });
        expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
        expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      });

      it('should clear tokens even if logout request fails', async () => {
        localStorage.setItem('refreshToken', 'refresh-token');

        mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

        await apiService.logout();

        expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
        expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
      });
    });

    describe('getProfile', () => {
      it('should get user profile', async () => {
        const mockResponse = {
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
            },
          },
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getProfile();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/profile');
        expect(result).toEqual(mockResponse.data.user);
      });
    });
  });

  describe('URL Management', () => {
    describe('createUrl', () => {
      it('should create URL successfully', async () => {
        const urlData = {
          originalUrl: 'https://example.com',
          title: 'Test URL',
        };

        const mockResponse = {
          data: {
            url: {
              id: '1',
              originalUrl: 'https://example.com',
              shortCode: 'abc123',
              shortUrl: 'http://localhost:3000/abc123',
              title: 'Test URL',
            },
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await apiService.createUrl(urlData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/urls', urlData);
        expect(result).toEqual(mockResponse.data.url);
      });
    });

    describe('getUrls', () => {
      it('should get URLs with filters', async () => {
        const filters = {
          page: 1,
          limit: 20,
          sortBy: 'created_at' as const,
          sortOrder: 'DESC' as const,
        };

        const mockResponse = {
          data: {
            urls: [
              {
                id: '1',
                originalUrl: 'https://example.com',
                shortCode: 'abc123',
                title: 'Test URL',
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiService.getUrls(filters);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/urls', {
          params: filters,
        });
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('deleteUrl', () => {
      it('should delete URL successfully', async () => {
        const urlId = '1';

        mockAxiosInstance.delete.mockResolvedValue({ data: { success: true } });

        await apiService.deleteUrl(urlId);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(`/urls/${urlId}`);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('isAuthenticated', () => {
      it('should return true when access token exists', () => {
        localStorage.setItem('accessToken', 'some-token');

        const result = apiService.isAuthenticated();

        expect(result).toBe(true);
      });

      it('should return false when access token does not exist', () => {
        localStorage.removeItem('accessToken');

        const result = apiService.isAuthenticated();

        expect(result).toBe(false);
      });
    });

    describe('getToken', () => {
      it('should return access token when it exists', () => {
        localStorage.setItem('accessToken', 'some-token');

        const result = apiService.getToken();

        expect(result).toBe('some-token');
      });

      it('should return null when access token does not exist', () => {
        localStorage.removeItem('accessToken');

        const result = apiService.getToken();

        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        apiService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toEqual({
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0,
      });
    });

    it('should handle generic errors', async () => {
      const mockError = {
        message: 'Something went wrong',
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        apiService.login({ email: 'test@example.com', password: 'password' })
      ).rejects.toEqual({
        success: false,
        message: 'Something went wrong',
      });
    });
  });
});
