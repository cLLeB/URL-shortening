# API Documentation

This document provides comprehensive information about the URL Shortener Pro REST API.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... } // Only for paginated responses
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "errors": ["Validation error 1", "Validation error 2"]
}
```

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP/user
- **Authentication**: 5 requests per 15 minutes per IP
- **URL Creation**: 50 requests per hour for regular users, 1000 for premium users

Rate limit headers are included in responses:
- `RateLimit-Limit`: Request limit
- `RateLimit-Remaining`: Remaining requests
- `RateLimit-Reset`: Reset time

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

#### POST /auth/login
Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Same as register response.

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### POST /auth/logout
Logout user and invalidate refresh token.

**Headers:** `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### GET /auth/profile
Get current user profile.

**Headers:** `Authorization: Bearer <access-token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T12:00:00.000Z"
  }
}
```

### URL Management

#### POST /urls
Create a new short URL.

**Headers:** `Authorization: Bearer <access-token>` (optional for anonymous users)

**Request Body:**
```json
{
  "originalUrl": "https://example.com/very-long-url",
  "customAlias": "my-link", // optional
  "title": "My Example Link", // optional
  "description": "Description of the link", // optional
  "expiresAt": "2024-12-31T23:59:59.000Z", // optional
  "isPublic": true // optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "message": "URL created successfully",
  "url": {
    "id": "uuid",
    "originalUrl": "https://example.com/very-long-url",
    "shortCode": "abc123",
    "shortUrl": "http://localhost:3000/abc123",
    "customAlias": "my-link",
    "title": "My Example Link",
    "description": "Description of the link",
    "isActive": true,
    "isPublic": true,
    "clickCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-12-31T23:59:59.000Z"
  }
}
```

#### GET /urls
Get user's URLs with pagination and filtering.

**Headers:** `Authorization: Bearer <access-token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (created_at, updated_at, click_count, title)
- `sortOrder`: Sort direction (ASC, DESC)
- `search`: Search term for URL or title
- `isActive`: Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "urls": [
    {
      "id": "uuid",
      "originalUrl": "https://example.com",
      "shortCode": "abc123",
      "shortUrl": "http://localhost:3000/abc123",
      "title": "Example",
      "clickCount": 42,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /urls/:id
Get specific URL details.

**Headers:** `Authorization: Bearer <access-token>`

**Response:** Single URL object as in POST /urls response.

#### PUT /urls/:id
Update URL details.

**Headers:** `Authorization: Bearer <access-token>`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "isActive": true,
  "isPublic": false,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

#### DELETE /urls/:id
Delete a URL.

**Headers:** `Authorization: Bearer <access-token>`

**Response:**
```json
{
  "success": true,
  "message": "URL deleted successfully"
}
```

### Analytics

#### GET /analytics/overview
Get user's overall analytics.

**Headers:** `Authorization: Bearer <access-token>`

**Query Parameters:**
- `timeRange`: Time period (24h, 7d, 30d, 90d, 1y)

**Response:**
```json
{
  "success": true,
  "analytics": {
    "totalUrls": 50,
    "totalClicks": 1250,
    "clicksInRange": 300,
    "uniqueCountries": 15,
    "uniqueVisitors": 180,
    "timeRange": "30d"
  }
}
```

#### GET /analytics/urls/:urlId
Get detailed analytics for a specific URL.

**Headers:** `Authorization: Bearer <access-token>`

**Query Parameters:**
- `timeRange`: Time period (24h, 7d, 30d, 90d, 1y)

**Response:**
```json
{
  "success": true,
  "analytics": {
    "url": {
      "id": "uuid",
      "shortCode": "abc123",
      "originalUrl": "https://example.com",
      "title": "Example",
      "totalClicks": 150,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "timeRange": "30d",
    "summary": {
      "totalClicksInRange": 45,
      "uniqueCountries": 8,
      "uniqueDevices": 3,
      "uniqueBrowsers": 5,
      "botClicks": 2
    },
    "clicksByDate": [
      {
        "date": "2024-01-01",
        "clicks": 10,
        "uniqueClicks": 8
      }
    ],
    "clicksByCountry": [
      {
        "country": "US",
        "clicks": 25,
        "uniqueClicks": 20
      }
    ],
    "clicksByDevice": [
      {
        "deviceType": "desktop",
        "clicks": 30,
        "uniqueClicks": 25
      }
    ],
    "recentClicks": [
      {
        "clickedAt": "2024-01-01T12:00:00.000Z",
        "country": "US",
        "city": "New York",
        "deviceType": "desktop",
        "browser": "Chrome",
        "isBot": false
      }
    ]
  }
}
```

### User Management

#### GET /users/stats
Get user statistics.

**Headers:** `Authorization: Bearer <access-token>`

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUrls": 25,
    "activeUrls": 23,
    "totalClicks": 500,
    "clicksThisMonth": 120,
    "topUrl": {
      "shortCode": "abc123",
      "shortUrl": "http://localhost:3000/abc123",
      "originalUrl": "https://example.com",
      "title": "Example",
      "clickCount": 150
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Create URL
const createUrl = async (originalUrl, customAlias) => {
  try {
    const response = await api.post('/urls', {
      originalUrl,
      customAlias
    });
    return response.data;
  } catch (error) {
    console.error('Error creating URL:', error.response.data);
  }
};

// Get analytics
const getAnalytics = async (urlId, timeRange = '30d') => {
  try {
    const response = await api.get(`/analytics/urls/${urlId}`, {
      params: { timeRange }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics:', error.response.data);
  }
};
```

### Python

```python
import requests

class URLShortenerAPI:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })
    
    def create_url(self, original_url, custom_alias=None):
        data = {'originalUrl': original_url}
        if custom_alias:
            data['customAlias'] = custom_alias
        
        response = self.session.post(f'{self.base_url}/urls', json=data)
        return response.json()
    
    def get_analytics(self, url_id, time_range='30d'):
        params = {'timeRange': time_range}
        response = self.session.get(
            f'{self.base_url}/analytics/urls/{url_id}',
            params=params
        )
        return response.json()

# Usage
api = URLShortenerAPI('http://localhost:5000/api', token='your-jwt-token')
result = api.create_url('https://example.com', 'my-link')
```

## Webhooks (Future Feature)

Webhooks will be available for real-time notifications:

- URL created
- URL clicked
- URL expired
- Analytics milestones

## API Versioning

The API uses URL versioning. Current version is v1:
- Current: `/api/...`
- Future: `/api/v2/...`

Breaking changes will be introduced in new versions with proper deprecation notices.
