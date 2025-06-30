# Architecture Overview

This document provides a comprehensive overview of the URL Shortener Pro system architecture, design decisions, and technical implementation details.

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │     CDN         │    │   Monitoring    │
│   (Nginx/HAProxy)│    │   (CloudFlare)  │    │  (Prometheus)   │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Analytics     │
│   (React SPA)   │◄──►│   (Node.js)     │◄──►│   Service       │
└─────────────────┘    └─────────┬───────┘    └─────────────────┘
                                 │
                                 ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   File Storage  │
│   (Primary DB)  │    │    (Cache)      │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Overview

#### Frontend Layer
- **React SPA**: Single-page application with TypeScript
- **State Management**: React Context API for global state
- **Routing**: React Router for client-side navigation
- **UI Framework**: Tailwind CSS for styling
- **Build Tool**: Create React App with custom configurations

#### Backend Layer
- **API Server**: Node.js with Express.js framework
- **Authentication**: JWT-based with refresh tokens
- **Validation**: Joi for request validation
- **Logging**: Winston for structured logging
- **Documentation**: Swagger/OpenAPI for API docs

#### Data Layer
- **Primary Database**: PostgreSQL for relational data
- **Cache Layer**: Redis for session storage and caching
- **File Storage**: Local filesystem (extensible to cloud storage)

#### Infrastructure Layer
- **Containerization**: Docker for application packaging
- **Orchestration**: Docker Compose for local development
- **Reverse Proxy**: Nginx for production deployment
- **Monitoring**: Health checks and logging

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Users       │    │      URLs       │    │   URL Clicks    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (UUID) PK    │    │ id (UUID) PK    │    │ id (UUID) PK    │
│ email           │    │ user_id FK      │    │ url_id FK       │
│ password_hash   │    │ original_url    │    │ ip_address      │
│ first_name      │    │ short_code      │    │ user_agent      │
│ last_name       │    │ custom_alias    │    │ referer         │
│ role            │    │ title           │    │ country         │
│ is_verified     │    │ description     │    │ city            │
│ is_active       │    │ is_active       │    │ device_type     │
│ created_at      │    │ is_public       │    │ browser         │
│ updated_at      │    │ click_count     │    │ os              │
│ last_login      │    │ password_hash   │    │ is_bot          │
└─────────────────┘    │ expires_at      │    │ clicked_at      │
                       │ created_at      │    └─────────────────┘
                       │ updated_at      │
                       │ last_accessed   │
                       └─────────────────┘

┌─────────────────┐
│  User Sessions  │
├─────────────────┤
│ id (UUID) PK    │
│ user_id FK      │
│ refresh_token   │
│ ip_address      │
│ user_agent      │
│ is_active       │
│ expires_at      │
│ created_at      │
│ last_used       │
└─────────────────┘
```

### Database Schema Details

#### Users Table
- **Purpose**: Store user account information
- **Key Features**: 
  - UUID primary keys for security
  - Role-based access control
  - Email verification status
  - Account activation status

#### URLs Table
- **Purpose**: Store shortened URL mappings
- **Key Features**:
  - Support for both authenticated and anonymous URLs
  - Custom alias support
  - Expiration dates
  - Privacy controls (public/private)
  - Click count caching

#### URL Clicks Table
- **Purpose**: Track detailed analytics for each click
- **Key Features**:
  - Geographic information
  - Device and browser detection
  - Bot detection
  - Referrer tracking

#### User Sessions Table
- **Purpose**: Manage user authentication sessions
- **Key Features**:
  - Refresh token storage
  - Session tracking
  - Device information
  - Automatic cleanup

### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_urls_short_code ON urls(short_code);
CREATE INDEX idx_urls_user_id ON urls(user_id);
CREATE INDEX idx_urls_created_at ON urls(created_at);
CREATE INDEX idx_url_clicks_url_id ON url_clicks(url_id);
CREATE INDEX idx_url_clicks_clicked_at ON url_clicks(clicked_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Composite indexes for analytics
CREATE INDEX idx_url_clicks_analytics ON url_clicks(url_id, clicked_at, is_bot);
CREATE INDEX idx_urls_user_active ON urls(user_id, is_active, created_at);
```

## API Design

### RESTful API Structure

```
/api/v1/
├── auth/
│   ├── POST /register
│   ├── POST /login
│   ├── POST /logout
│   ├── POST /refresh
│   ├── GET /profile
│   ├── PUT /profile
│   └── POST /change-password
├── urls/
│   ├── POST /
│   ├── GET /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
├── analytics/
│   ├── GET /overview
│   ├── GET /urls/:id
│   ├── GET /urls/:id/clicks
│   ├── GET /top-urls
│   └── GET /export/:id
└── users/
    ├── GET /stats
    ├── GET /sessions
    ├── DELETE /sessions/:id
    └── GET /activity
```

### Request/Response Format

#### Standard Response Format
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": { ... }, // For paginated responses
  "meta": { ... }        // Additional metadata
}
```

#### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "errors": ["Validation error 1", "Validation error 2"],
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Architecture

### Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Backend   │    │  Database   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │ 1. Login Request │                  │
       ├─────────────────►│                  │
       │                  │ 2. Verify Creds │
       │                  ├─────────────────►│
       │                  │ 3. User Data     │
       │                  │◄─────────────────┤
       │ 4. JWT Tokens    │                  │
       │◄─────────────────┤                  │
       │                  │                  │
       │ 5. API Request   │                  │
       │ + Access Token   │                  │
       ├─────────────────►│                  │
       │                  │ 6. Verify Token  │
       │                  │                  │
       │ 7. Response      │                  │
       │◄─────────────────┤                  │
```

### Security Measures

#### Input Validation
- **Request Validation**: Joi schemas for all endpoints
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization and CSP headers
- **Rate Limiting**: Per-IP and per-user rate limits

#### Authentication & Authorization
- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: Long-lived refresh tokens (7 days)
- **Role-Based Access**: User, Premium, Admin roles
- **Session Management**: Secure session tracking

#### Data Protection
- **Password Hashing**: bcrypt with configurable rounds
- **Sensitive Data**: Environment variable configuration
- **HTTPS**: TLS encryption for all communications
- **CORS**: Configured cross-origin resource sharing

## Caching Strategy

### Redis Cache Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │     Redis       │    │   PostgreSQL    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ 1. Check Cache       │                      │
          ├─────────────────────►│                      │
          │ 2. Cache Miss        │                      │
          │◄─────────────────────┤                      │
          │ 3. Query Database    │                      │
          ├──────────────────────┼─────────────────────►│
          │ 4. Database Result   │                      │
          │◄─────────────────────┼──────────────────────┤
          │ 5. Store in Cache    │                      │
          ├─────────────────────►│                      │
          │ 6. Return Result     │                      │
```

### Cache Patterns

#### URL Lookup Cache
```javascript
// Cache frequently accessed URLs
const cacheKey = `url:${shortCode}`;
const cachedUrl = await redis.get(cacheKey);

if (cachedUrl) {
  return JSON.parse(cachedUrl);
}

const url = await database.getUrlByShortCode(shortCode);
await redis.setex(cacheKey, 3600, JSON.stringify(url)); // 1 hour TTL
```

#### User Session Cache
```javascript
// Cache user sessions
const sessionKey = `session:${userId}`;
await redis.setex(sessionKey, 900, JSON.stringify(sessionData)); // 15 minutes
```

#### Analytics Cache
```javascript
// Cache analytics data
const analyticsKey = `analytics:${urlId}:${timeRange}`;
await redis.setex(analyticsKey, 1800, JSON.stringify(analytics)); // 30 minutes
```

## Performance Optimization

### Database Optimization

#### Query Optimization
- **Indexes**: Strategic indexing for frequent queries
- **Query Planning**: EXPLAIN ANALYZE for query optimization
- **Connection Pooling**: Efficient database connection management
- **Read Replicas**: Separate read/write operations (future)

#### Caching Strategy
- **Application Cache**: Redis for hot data
- **Query Result Cache**: Cache expensive query results
- **CDN**: Static asset caching
- **Browser Cache**: Client-side caching headers

### Application Optimization

#### Backend Performance
- **Async Operations**: Non-blocking I/O operations
- **Connection Pooling**: Database and Redis connections
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevent abuse and ensure fair usage

#### Frontend Performance
- **Code Splitting**: Lazy loading of routes and components
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: Responsive images and lazy loading
- **Service Workers**: Offline functionality and caching

## Scalability Considerations

### Horizontal Scaling

#### Application Scaling
```
┌─────────────────┐
│  Load Balancer  │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌─────────┐ ┌─────────┐
│ App 1   │ │ App 2   │
└─────────┘ └─────────┘
    │           │
    └─────┬─────┘
          ▼
┌─────────────────┐
│   Database      │
│   (Primary)     │
└─────────────────┘
```

#### Database Scaling
- **Read Replicas**: Distribute read operations
- **Sharding**: Partition data across multiple databases
- **Connection Pooling**: Efficient connection management
- **Query Optimization**: Minimize database load

### Monitoring and Observability

#### Application Metrics
- **Response Times**: API endpoint performance
- **Error Rates**: Application error tracking
- **Throughput**: Requests per second
- **Resource Usage**: CPU, memory, disk usage

#### Business Metrics
- **URL Creation Rate**: URLs created per time period
- **Click Through Rate**: URL usage patterns
- **User Growth**: Registration and retention metrics
- **Geographic Distribution**: Usage by location

## Deployment Architecture

### Production Environment

```
┌─────────────────┐    ┌─────────────────┐
│   CloudFlare    │    │   Monitoring    │
│     (CDN)       │    │  (Prometheus)   │
└─────────┬───────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│     Nginx       │
│ (Load Balancer) │
└─────────┬───────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌─────────┐ ┌─────────┐
│ App 1   │ │ App 2   │
│(Docker) │ │(Docker) │
└─────────┘ └─────────┘
    │           │
    └─────┬─────┘
          ▼
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │
│   (Primary)     │    │   (Cluster)     │
└─────────────────┘    └─────────────────┘
```

### Container Architecture

#### Docker Compose Services
- **Frontend**: React application with Nginx
- **Backend**: Node.js API server
- **Database**: PostgreSQL with persistent volumes
- **Cache**: Redis with persistence
- **Proxy**: Nginx reverse proxy

#### Health Checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Future Enhancements

### Planned Features
1. **Microservices**: Split into smaller, focused services
2. **Event Sourcing**: Implement event-driven architecture
3. **GraphQL**: Alternative API interface
4. **Real-time Analytics**: WebSocket-based live updates
5. **Machine Learning**: Bot detection and fraud prevention

### Scalability Improvements
1. **Database Sharding**: Horizontal database scaling
2. **Message Queues**: Asynchronous processing
3. **CDN Integration**: Global content distribution
4. **Auto-scaling**: Dynamic resource allocation
5. **Multi-region**: Geographic distribution

This architecture provides a solid foundation for a scalable, secure, and maintainable URL shortening service while allowing for future growth and enhancements.
