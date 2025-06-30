# URL Shortener Pro - Setup Guide

This guide will walk you through setting up the URL Shortener Pro application on your local machine or server.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **PostgreSQL** (v14.0 or higher)
- **Redis** (v7.0 or higher)

### Optional (for Docker deployment)
- **Docker** (v20.0 or higher)
- **Docker Compose** (v2.0 or higher)

## Installation Methods

### Method 1: Docker Compose (Recommended)

This is the easiest way to get started with all services running in containers.

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd url-shortener-pro
   ```

2. **Configure environment variables**
   ```bash
   # Backend environment
   cp backend/.env.example backend/.env
   
   # Frontend environment
   cp frontend/.env.example frontend/.env
   ```

3. **Start all services**
   ```bash
   # For production
   docker-compose up -d
   
   # For development with hot reload
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

4. **Initialize the database**
   ```bash
   # The database will be automatically initialized on first run
   # Check logs to ensure migration completed successfully
   docker-compose logs backend
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

### Method 2: Manual Installation

For development or custom deployments, you can install each component manually.

#### Step 1: Database Setup

1. **Install and start PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Windows
   # Download and install from https://www.postgresql.org/download/windows/
   ```

2. **Create database and user**
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   CREATE DATABASE url_shortener;
   CREATE USER url_shortener_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE url_shortener TO url_shortener_user;
   \q
   ```

3. **Install and start Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   
   # macOS (using Homebrew)
   brew install redis
   brew services start redis
   
   # Windows
   # Download and install from https://github.com/microsoftarchive/redis/releases
   ```

#### Step 2: Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your database and Redis credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=url_shortener
   DB_USER=url_shortener_user
   DB_PASSWORD=your_password
   
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the backend server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

#### Step 3: Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_BASE_URL=http://localhost:3000
   ```

4. **Start the frontend server**
   ```bash
   # Development mode
   npm start
   
   # Build for production
   npm run build
   ```

## Configuration

### Environment Variables

#### Backend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `5000` | No |
| `DB_HOST` | Database host | `localhost` | Yes |
| `DB_PORT` | Database port | `5432` | No |
| `DB_NAME` | Database name | `url_shortener` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | - | Yes |
| `REDIS_HOST` | Redis host | `localhost` | Yes |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | - | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `BASE_URL` | Frontend base URL | `http://localhost:3000` | Yes |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` | Yes |

#### Frontend Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000/api` | Yes |
| `REACT_APP_BASE_URL` | Frontend base URL | `http://localhost:3000` | Yes |

### Database Configuration

The application uses PostgreSQL with the following tables:
- `users` - User accounts and authentication
- `urls` - Shortened URLs and metadata
- `url_clicks` - Click tracking and analytics
- `user_sessions` - Session management
- `api_keys` - API key management

### Redis Configuration

Redis is used for:
- Caching frequently accessed URLs
- Rate limiting
- Session storage
- Analytics data aggregation

## Verification

### Health Checks

1. **Backend Health Check**
   ```bash
   curl http://localhost:5000/health
   ```
   Expected response:
   ```json
   {
     "status": "OK",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "uptime": 123.456,
     "environment": "development"
   }
   ```

2. **Database Connection**
   ```bash
   curl http://localhost:5000/api/health/db
   ```

3. **Redis Connection**
   ```bash
   curl http://localhost:5000/api/health/redis
   ```

4. **Frontend Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

### Test the Application

1. **Create a test URL**
   ```bash
   curl -X POST http://localhost:5000/api/urls \
     -H "Content-Type: application/json" \
     -d '{"originalUrl": "https://example.com"}'
   ```

2. **Access the frontend**
   - Open http://localhost:3000 in your browser
   - Try creating a short URL
   - Test the redirect functionality

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check database credentials in `.env` file
   - Ensure database exists and user has permissions

2. **Redis Connection Failed**
   - Verify Redis is running: `sudo systemctl status redis-server`
   - Check Redis configuration in `.env` file
   - Test Redis connection: `redis-cli ping`

3. **Port Already in Use**
   - Check what's using the port: `lsof -i :5000` or `netstat -tulpn | grep :5000`
   - Change the port in environment variables
   - Kill the process using the port

4. **CORS Errors**
   - Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
   - Check that both frontend and backend are running
   - Clear browser cache and cookies

5. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set in backend `.env`
   - Clear browser localStorage and cookies
   - Check token expiration settings

### Logs

- **Backend logs**: Check console output or `logs/` directory
- **Frontend logs**: Check browser console
- **Database logs**: Check PostgreSQL logs
- **Redis logs**: Check Redis logs
- **Docker logs**: `docker-compose logs [service-name]`

## Next Steps

After successful setup:

1. **Review the [API Documentation](API.md)** for integration details
2. **Check the [Deployment Guide](DEPLOYMENT.md)** for production deployment
3. **Read the [Development Guide](DEVELOPMENT.md)** for contributing
4. **Explore the [Architecture Overview](ARCHITECTURE.md)** for system design

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review the application logs for error details
3. Ensure all prerequisites are properly installed
4. Verify environment configuration matches your setup
