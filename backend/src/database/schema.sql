-- URL Shortener Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'premium')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- URLs table
CREATE TABLE IF NOT EXISTS urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_code VARCHAR(50) UNIQUE NOT NULL,
    custom_alias VARCHAR(100),
    title VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    password_hash VARCHAR(255), -- For password-protected URLs
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT urls_original_url_check CHECK (original_url ~* '^https?://'),
    CONSTRAINT urls_short_code_check CHECK (LENGTH(short_code) >= 3),
    CONSTRAINT urls_custom_alias_check CHECK (custom_alias IS NULL OR LENGTH(custom_alias) >= 3)
);

-- URL clicks/analytics table
CREATE TABLE IF NOT EXISTS url_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_id UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    is_bot BOOLEAN DEFAULT FALSE,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for analytics queries
    INDEX idx_url_clicks_url_id (url_id),
    INDEX idx_url_clicks_clicked_at (clicked_at),
    INDEX idx_url_clicks_country (country),
    INDEX idx_url_clicks_device_type (device_type)
);

-- API keys table for rate limiting and API access
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000, -- requests per hour
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- User sessions table for JWT refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- URL tags table for organization
CREATE TABLE IF NOT EXISTS url_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, name)
);

-- Junction table for URL-Tag relationships
CREATE TABLE IF NOT EXISTS url_tag_assignments (
    url_id UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES url_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (url_id, tag_id)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_custom_alias ON urls(custom_alias) WHERE custom_alias IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls(created_at);
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_urls_is_active ON urls(is_active);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_urls_updated_at BEFORE UPDATE ON urls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_url_clicks()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE urls 
    SET click_count = click_count + 1, 
        last_accessed = CURRENT_TIMESTAMP 
    WHERE id = NEW.url_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_url_clicks 
    AFTER INSERT ON url_clicks
    FOR EACH ROW EXECUTE FUNCTION increment_url_clicks();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('max_urls_per_user', '1000', 'Maximum number of URLs a user can create'),
    ('default_url_expiry_days', '365', 'Default expiry period for URLs in days'),
    ('enable_analytics', 'true', 'Enable detailed analytics tracking'),
    ('enable_geolocation', 'true', 'Enable geolocation tracking for clicks'),
    ('maintenance_mode', 'false', 'System maintenance mode flag')
ON CONFLICT (key) DO NOTHING;

-- Create a view for URL analytics summary
CREATE OR REPLACE VIEW url_analytics_summary AS
SELECT 
    u.id,
    u.short_code,
    u.original_url,
    u.title,
    u.click_count,
    u.created_at,
    u.last_accessed,
    COUNT(DISTINCT uc.country) as unique_countries,
    COUNT(DISTINCT uc.device_type) as unique_devices,
    COUNT(DISTINCT DATE(uc.clicked_at)) as active_days,
    AVG(EXTRACT(EPOCH FROM (uc.clicked_at - LAG(uc.clicked_at) OVER (PARTITION BY u.id ORDER BY uc.clicked_at)))) as avg_time_between_clicks
FROM urls u
LEFT JOIN url_clicks uc ON u.id = uc.url_id
WHERE u.is_active = true
GROUP BY u.id, u.short_code, u.original_url, u.title, u.click_count, u.created_at, u.last_accessed;
