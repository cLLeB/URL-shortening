// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'premium' | 'admin';
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  tokens: AuthTokens;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// URL types
export interface Url {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  customAlias?: string;
  title?: string;
  description?: string;
  isActive: boolean;
  isPublic: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastAccessed?: string;
}

export interface CreateUrlData {
  originalUrl: string;
  customAlias?: string;
  title?: string;
  description?: string;
  expiresAt?: string;
  isPublic?: boolean;
}

export interface UpdateUrlData {
  title?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  expiresAt?: string | null;
}

// Analytics types
export interface ClickData {
  clickedAt: string;
  ipAddress: string;
  country?: string;
  city?: string;
  deviceType: string;
  browser: string;
  os: string;
  referer?: string;
  isBot: boolean;
}

export interface AnalyticsSummary {
  totalClicksInRange: number;
  uniqueCountries: number;
  uniqueDevices: number;
  uniqueBrowsers: number;
  botClicks: number;
}

export interface ClicksByDate {
  date: string;
  clicks: number;
  uniqueClicks: number;
}

export interface ClicksByCountry {
  country: string;
  clicks: number;
  uniqueClicks: number;
}

export interface ClicksByDevice {
  deviceType: string;
  clicks: number;
  uniqueClicks: number;
}

export interface ClicksByBrowser {
  browser: string;
  clicks: number;
  uniqueClicks: number;
}

export interface ClicksByReferer {
  referer: string;
  clicks: number;
}

export interface UrlAnalytics {
  url: {
    id: string;
    shortCode: string;
    originalUrl: string;
    title?: string;
    totalClicks: number;
    createdAt: string;
    lastAccessed?: string;
  };
  timeRange: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: AnalyticsSummary;
  clicksByDate: ClicksByDate[];
  clicksByCountry: ClicksByCountry[];
  clicksByDevice: ClicksByDevice[];
  clicksByBrowser: ClicksByBrowser[];
  clicksByReferer: ClicksByReferer[];
  recentClicks: ClickData[];
}

export interface UserAnalytics {
  totalUrls: number;
  totalClicks: number;
  clicksInRange: number;
  uniqueCountries: number;
  uniqueVisitors: number;
  timeRange: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// Pagination types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: string[];
  status?: number;
}

// Form types
export interface FormErrors {
  [key: string]: string | undefined;
}

// UI State types
export interface LoadingState {
  [key: string]: boolean;
}

export interface NotificationState {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Filter and sort types
export interface UrlFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'click_count' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface AnalyticsFilters {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '1y';
  limit?: number;
  sortBy?: 'clicks' | 'unique_clicks' | 'recent_activity';
}

// User stats types
export interface UserStats {
  totalUrls: number;
  activeUrls: number;
  totalClicks: number;
  clicksThisMonth: number;
  topUrl?: {
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    title?: string;
    clickCount: number;
  };
}

// Session types
export interface UserSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  isCurrent: boolean;
}

// Activity types
export interface UserActivity {
  type: 'url_created' | 'url_updated' | 'url_deleted';
  date: string;
  url: {
    id: string;
    shortCode: string;
    shortUrl: string;
    originalUrl: string;
    title?: string;
  };
}

// Theme types
export type Theme = 'light' | 'dark' | 'system';

// Export utility types
export type TimeRange = '24h' | '7d' | '30d' | '90d' | '1y';
export type SortOrder = 'ASC' | 'DESC';
export type UserRole = 'user' | 'premium' | 'admin';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
