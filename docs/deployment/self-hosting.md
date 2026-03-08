---
title: Self-Hosting Guide
description: Complete guide for self-hosting Grant on your own infrastructure
---

# Self-Hosting Guide

Grant is designed to be self-hosted, giving you complete control over your data and infrastructure.

## Overview

Grant can be self-hosted using:

- **Docker Compose** - For local development and small deployments

## Deployment Options

### Option 1: Docker Compose (Recommended for Development)

Perfect for local development, testing, and small deployments.

**Steps:**

1. **Clone the repository**:

   ```bash
   git clone https://github.com/logusgraphics/grant.git
   cd grant
   ```

2. **Configure infrastructure**:

   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Configure API**:

   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your settings
   ```

4. **Start services**:

   ```bash
   docker-compose up -d
   ```

5. **Run migrations**:

   ```bash
   cd apps/api
   pnpm run db:migrate
   ```

6. **Start the API**:
   ```bash
   pnpm run start
   ```

See the **[Docker Deployment](/deployment/docker)** guide for detailed instructions.

### Option 2: Manual Deployment

Deploy to any cloud provider or your own servers.

**Requirements:**

- Node.js 22+ runtime
- PostgreSQL 14+ database
- Redis 7+ (optional, for caching)
- Reverse proxy (Nginx/Caddy)

**Steps:**

1. **Setup database**:
   - Create PostgreSQL database
   - Note connection string

2. **Setup Redis** (optional):
   - Install Redis server
   - Configure authentication

3. **Deploy API**:

   ```bash
   # Clone repository
   git clone https://github.com/logusgraphics/grant.git
   cd grant/apps/api

   # Install dependencies
   pnpm install

   # Configure environment
   cp .env.example .env
   # Edit .env with your settings

   # Build
   pnpm run build

   # Run migrations
   pnpm run db:migrate

   # Start with PM2 or systemd
   pm2 start dist/server.js --name grant-api
   ```

4. **Setup reverse proxy**:

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

   **Trusted proxy:** The API uses `X-Forwarded-For` and `X-Real-IP` for rate limiting and session tracking. Always run the API behind a trusted reverse proxy and set these headers so limits and logs reflect the real client IP. See [Security – Rate limiting](../architecture/security.md#rate-limiting).

## Infrastructure Requirements

### Minimum Requirements (Development)

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Database**: PostgreSQL 14+
- **OS**: Linux, macOS, or Windows with WSL2

### Recommended Requirements (Production)

- **CPU**: 4+ cores
- **RAM**: 8+ GB
- **Storage**: 100+ GB SSD
- **Database**: PostgreSQL 16+ (managed service recommended)
- **Redis**: 7+ (managed service recommended)
- **Load Balancer**: Application load balancer
- **CDN**: For static assets

## Configuration

### Environment Variables

See the **[Configuration Guide](/getting-started/configuration)** for complete environment variable documentation.

**Essential variables:**

```bash
# Application
NODE_ENV=production
APP_PORT=4000

# Database
DB_URL=postgresql://user:pass@host:5432/grant

# Security
SECURITY_FRONTEND_URL=https://yourdomain.com
```

### Database Setup

1. **Create database**:

   ```sql
   CREATE DATABASE grant;
   CREATE USER grant_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE grant TO grant_user;
   ```

2. **Run migrations**:

   ```bash
   cd apps/api
   pnpm run db:migrate
   ```

3. **Verify**:
   ```bash
   psql postgresql://grant_user:password@localhost:5432/grant
   ```

## Security Considerations

### SSL/TLS

Always use HTTPS in production:

```bash
# Let's Encrypt with Certbot
sudo certbot --nginx -d api.yourdomain.com
```

### Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular backups
- Encrypted at rest (if supported)

### Application Security

- Enable automatic signing key rotation (see JWT configuration)
- Use environment-specific secrets
- Enable rate limiting
- Monitor for suspicious activity

## Monitoring & Maintenance

### Health Checks

Built-in health check endpoint:

```bash
curl http://localhost:4000/health
# Response: {"status":"ok","timestamp":"..."}
```

### Logging

Configure log levels in `.env`:

```bash
LOG_LEVEL=info  # error, warn, info, debug
```

### Backups

**Database backups:**

```bash
# Daily backup script
pg_dump postgresql://user:pass@host:5432/grant > backup-$(date +%Y%m%d).sql
```

**Automated backups with cron:**

```bash
0 2 * * * /path/to/backup-script.sh
```

### Updates

**Update to latest version:**

```bash
git pull origin main
cd apps/api
pnpm install
pnpm run build
pnpm run db:migrate
pm2 restart grant-api
```

## Troubleshooting

### Common Issues

For common deployment issues, check [Docker Deployment](/deployment/docker) and [Configuration](/getting-started/configuration), or [file an issue](https://github.com/logusgraphics/grant/issues).

### Support

- **Documentation**: Browse these docs
- **GitHub Issues**: [Report bugs](https://github.com/logusgraphics/grant/issues)
- **Community**: Join our Discord server

## Related Documentation

- **[Docker Deployment](/deployment/docker)** - Docker Compose setup
- **[Configuration](/getting-started/configuration)** - Environment variables
- **[Quick Start](/getting-started/quick-start)** - Local development setup

---

**Next Steps:**

- Choose your deployment method
- Follow the specific deployment guide
- Configure monitoring and backups
- Set up SSL/TLS certificates
