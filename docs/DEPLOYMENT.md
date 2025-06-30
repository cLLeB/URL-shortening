# Deployment Guide

This guide covers deploying URL Shortener Pro to production environments.

## Production Deployment Options

### 1. Docker Compose (Recommended)

The easiest way to deploy to production with all services containerized.

#### Prerequisites
- Docker 20.0+
- Docker Compose 2.0+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt recommended)

#### Steps

1. **Clone and configure**
   ```bash
   git clone <repository-url>
   cd url-shortener-pro
   ```

2. **Create production environment files**
   ```bash
   # Backend production environment
   cp backend/.env.example backend/.env.production
   
   # Frontend production environment
   cp frontend/.env.example frontend/.env.production
   ```

3. **Configure production environment**
   
   **Backend (.env.production):**
   ```env
   NODE_ENV=production
   PORT=5000
   
   # Database
   DB_HOST=postgres
   DB_PORT=5432
   DB_NAME=url_shortener
   DB_USER=url_shortener_user
   DB_PASSWORD=your-secure-password
   
   # Redis
   REDIS_HOST=redis
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   
   # Security
   JWT_SECRET=your-super-secure-jwt-secret-key
   JWT_REFRESH_SECRET=your-refresh-token-secret
   BCRYPT_ROUNDS=12
   
   # URLs
   BASE_URL=https://yourdomain.com
   CORS_ORIGIN=https://yourdomain.com
   
   # Rate limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   
   # Features
   ENABLE_GEOLOCATION=true
   ENABLE_USER_AGENT_PARSING=true
   
   # Admin account
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=your-admin-password
   ```

   **Frontend (.env.production):**
   ```env
   REACT_APP_API_URL=https://api.yourdomain.com/api
   REACT_APP_BASE_URL=https://yourdomain.com
   REACT_APP_ENV=production
   ```

4. **Create production Docker Compose override**
   
   **docker-compose.prod.yml:**
   ```yaml
   version: '3.8'
   
   services:
     postgres:
       environment:
         POSTGRES_PASSWORD: your-secure-password
       volumes:
         - postgres_prod_data:/var/lib/postgresql/data
   
     redis:
       command: redis-server --appendonly yes --requirepass your-redis-password
       volumes:
         - redis_prod_data:/data
   
     backend:
       env_file:
         - ./backend/.env.production
       restart: unless-stopped
   
     frontend:
       env_file:
         - ./frontend/.env.production
       restart: unless-stopped
   
     nginx:
       profiles:
         - production
   
   volumes:
     postgres_prod_data:
     redis_prod_data:
   ```

5. **Deploy with SSL**
   ```bash
   # Start all services
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   
   # Check logs
   docker-compose logs -f
   ```

### 2. Manual Deployment

For custom server setups or when you need more control.

#### Server Requirements
- Ubuntu 20.04+ or CentOS 8+
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Nginx

#### Steps

1. **Prepare the server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PostgreSQL
   sudo apt install postgresql postgresql-contrib
   
   # Install Redis
   sudo apt install redis-server
   
   # Install Nginx
   sudo apt install nginx
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Setup databases**
   ```bash
   # PostgreSQL
   sudo -u postgres psql
   CREATE DATABASE url_shortener;
   CREATE USER url_shortener_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE url_shortener TO url_shortener_user;
   \q
   
   # Configure Redis
   sudo nano /etc/redis/redis.conf
   # Set: requirepass your-redis-password
   sudo systemctl restart redis
   ```

3. **Deploy application**
   ```bash
   # Clone repository
   git clone <repository-url> /var/www/url-shortener-pro
   cd /var/www/url-shortener-pro
   
   # Backend setup
   cd backend
   npm ci --only=production
   cp .env.example .env
   # Edit .env with production values
   npm run migrate
   
   # Frontend setup
   cd ../frontend
   npm ci
   cp .env.example .env
   # Edit .env with production values
   npm run build
   ```

4. **Configure PM2**
   
   **ecosystem.config.js:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'url-shortener-backend',
       script: './backend/src/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 5000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

   ```bash
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   
   **/etc/nginx/sites-available/url-shortener:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;
   
       ssl_certificate /path/to/ssl/cert.pem;
       ssl_certificate_key /path/to/ssl/private.key;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
   
       # Frontend
       location / {
           root /var/www/url-shortener-pro/frontend/build;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 1y;
               add_header Cache-Control "public, immutable";
           }
       }
   
       # Backend API
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   
       # Health check
       location /health {
           proxy_pass http://localhost:5000/health;
       }
   }
   ```

   ```bash
   # Enable site
   sudo ln -s /etc/nginx/sites-available/url-shortener /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Logging

### 1. Application Monitoring

**Install monitoring tools:**
```bash
# Install monitoring stack
npm install -g @pm2/io
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 2. System Monitoring

**Setup basic monitoring:**
```bash
# Install htop for system monitoring
sudo apt install htop

# Setup log monitoring
sudo apt install logwatch
```

### 3. Database Monitoring

**PostgreSQL monitoring:**
```sql
-- Enable logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- Monitor connections
SELECT count(*) FROM pg_stat_activity;
```

## Backup Strategy

### 1. Database Backup

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/url-shortener"
DB_NAME="url_shortener"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U url_shortener_user $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://your-backup-bucket/
```

### 2. Redis Backup

```bash
#!/bin/bash
# backup-redis.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/url-shortener"

mkdir -p $BACKUP_DIR

# Create Redis backup
redis-cli --rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "redis_backup_*.rdb" -mtime +7 -delete
```

### 3. Automated Backups

```bash
# Add to crontab
sudo crontab -e

# Daily database backup at 2 AM
0 2 * * * /path/to/backup-db.sh

# Daily Redis backup at 3 AM
0 3 * * * /path/to/backup-redis.sh
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_urls_user_id ON urls(user_id);
CREATE INDEX CONCURRENTLY idx_urls_short_code ON urls(short_code);
CREATE INDEX CONCURRENTLY idx_url_clicks_url_id ON url_clicks(url_id);
CREATE INDEX CONCURRENTLY idx_url_clicks_clicked_at ON url_clicks(clicked_at);

-- Analyze tables
ANALYZE urls;
ANALYZE url_clicks;
ANALYZE users;
```

### 2. Redis Optimization

```bash
# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Set appropriate memory limit
maxmemory 1gb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

### 3. Application Optimization

```bash
# Enable gzip compression in Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

## Security Hardening

### 1. Server Security

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh
```

### 2. Application Security

```bash
# Set proper file permissions
sudo chown -R www-data:www-data /var/www/url-shortener-pro
sudo chmod -R 755 /var/www/url-shortener-pro

# Secure environment files
sudo chmod 600 /var/www/url-shortener-pro/backend/.env
```

## Scaling Considerations

### 1. Horizontal Scaling

- Use load balancer (HAProxy, AWS ALB)
- Multiple backend instances
- Database read replicas
- Redis cluster

### 2. Vertical Scaling

- Increase server resources
- Optimize database queries
- Implement caching strategies

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   # Check logs
   pm2 logs
   
   # Check environment variables
   pm2 env 0
   ```

2. **Database connection issues**
   ```bash
   # Test connection
   psql -h localhost -U url_shortener_user -d url_shortener
   
   # Check PostgreSQL status
   sudo systemctl status postgresql
   ```

3. **High memory usage**
   ```bash
   # Monitor processes
   htop
   
   # Check Redis memory
   redis-cli info memory
   ```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review application logs
   - Check disk space
   - Monitor performance metrics

2. **Monthly**
   - Update dependencies
   - Review security patches
   - Analyze backup integrity

3. **Quarterly**
   - Performance optimization review
   - Security audit
   - Capacity planning review
