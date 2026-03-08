---
title: Docker Deployment
description: Complete guide for setting up and managing Grant infrastructure with Docker Compose
---

# Docker Deployment

This guide explains how to set up and manage the Grant infrastructure services using Docker Compose.

## Overview

The Grant uses Docker Compose to manage its infrastructure services:

- **PostgreSQL 16** - Primary database
- **PgAdmin 4** - Database management UI
- **Redis 7** - Caching layer (optional)

## Quick Start

### 1. Configure Infrastructure

```bash
# Copy the infrastructure environment template
cp .env.example .env

# Edit if needed (optional - defaults work for development)
vim .env
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# Or start specific services
docker-compose up -d postgres redis
```

### 3. Verify Services

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
docker-compose logs -f postgres  # specific service
```

### 4. Configure API

```bash
# Copy API environment template
cp apps/api/.env.example apps/api/.env

# The default DB_URL already matches docker-compose settings
# DB_URL=postgresql://grant_user:grant_password@localhost:5432/grant
```

### 5. Run API

```bash
cd apps/api
pnpm run dev
```

## Environment Configuration

### Root `.env` (Infrastructure)

Controls Docker Compose services:

```bash
# Database
POSTGRES_DB=grant          # Database name
POSTGRES_USER=grant_user            # Database user
POSTGRES_PASSWORD=grant_password    # Database password

# PgAdmin
PGADMIN_EMAIL=admin@grant.dev      # Login email
PGADMIN_PASSWORD=grant_password    # Login password

# Redis
REDIS_PASSWORD=grant_redis_password # Redis auth password
```

### `apps/api/.env` (Application)

Controls the API application:

```bash
# Must match infrastructure settings
DB_URL=postgresql://grant_user:grant_password@localhost:5432/grant
REDIS_PASSWORD=grant_redis_password

# See apps/api/.env.example for all options
```

## Service Details

### PostgreSQL

**Container**: `grant-postgres`

**Port**: `5432`

**Default credentials**:

- Database: `grant`
- User: `grant_user`
- Password: `grant_password`

**Connection string**:

```
postgresql://grant_user:grant_password@localhost:5432/grant
```

**Commands**:

```bash
# Connect via psql
docker exec -it grant-postgres psql -U grant_user -d grant

# View logs
docker-compose logs -f postgres

# Restart
docker-compose restart postgres
```

### PgAdmin

**Container**: `grant-pgadmin`

**Port**: `8080`

**Access**: [http://localhost:8080](http://localhost:8080)

**Default credentials**:

- Email: `admin@grant.dev`
- Password: `grant_password`

**Add Server in PgAdmin**:

1. Right-click "Servers" → "Register" → "Server"
2. **General tab**: Name = "Grant"
3. **Connection tab**:
   - Host: `postgres` (service name)
   - Port: `5432`
   - Database: `grant`
   - Username: `grant_user`
   - Password: `grant_password`

### Redis

**Container**: `grant-redis`

**Port**: `6379`

**Default password**: `grant_redis_password`

**Commands**:

```bash
# Connect to Redis CLI
docker exec -it grant-redis redis-cli -a grant_redis_password

# Test connection
redis-cli -h localhost -p 6379 -a grant_redis_password ping
# Response: PONG

# View cache keys
docker exec -it grant-redis redis-cli -a grant_redis_password KEYS 'grant:*'

# Monitor operations
docker exec -it grant-redis redis-cli -a grant_redis_password MONITOR
```

## Common Operations

### Start Services

```bash
# All services
docker-compose up -d

# Specific service
docker-compose up -d postgres
docker-compose up -d redis
docker-compose up -d pgadmin
```

### Stop Services

```bash
# All services
docker-compose down

# Keep data (don't remove volumes)
docker-compose down

# Remove data (WARNING: deletes all data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 postgres
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart postgres
```

### Check Status

```bash
# View running containers
docker-compose ps

# View resource usage
docker stats grant-postgres grant-redis
```

## Data Management

### Backup Database

```bash
# Create backup
docker exec grant-postgres pg_dump -U grant_user grant > backup.sql

# With timestamp
docker exec grant-postgres pg_dump -U grant_user grant > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
cat backup.sql | docker exec -i grant-postgres psql -U grant_user -d grant

# Or
docker exec -i grant-postgres psql -U grant_user -d grant < backup.sql
```

### Reset Database

```bash
# Stop API first
cd apps/api && pnpm run stop

# Remove and recreate
docker-compose down
docker volume rm grant_postgres_data
docker-compose up -d postgres

# Run migrations
cd apps/api && pnpm run db:migrate
```

### Clear Redis Cache

```bash
# Flush all cache
docker exec -it grant-redis redis-cli -a grant_redis_password FLUSHDB

# Delete specific keys
docker exec -it grant-redis redis-cli -a grant_redis_password DEL grant:some-key
```

## Production Deployment

### Security Considerations

1. **Change all passwords**:

   ```bash
   # Generate secure passwords
   openssl rand -base64 32
   ```

2. **Use environment-specific `.env` files**:
   - `.env.development`
   - `.env.staging`
   - `.env.production`

3. **Enable TLS for Redis**:

   ```yaml
   redis:
     command: redis-server --requirepass ${REDIS_PASSWORD} --tls-port 6380 --tls-cert-file /certs/redis.crt --tls-key-file /certs/redis.key
   ```

4. **Use external managed services**:
   - Managed PostgreSQL (e.g. from your cloud or database provider)
   - Managed Redis (e.g. Redis Cloud, Upstash, or provider-hosted)
   - Don't run databases in containers in production

### Recommended Production Setup

For production, use managed services instead of Docker Compose:

```bash
# apps/api/.env (production)
DB_URL=postgresql://user:pass@your-db-host:5432/grant
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_ENABLE_TLS=true
```

## Troubleshooting

### Port Already in Use

**Problem**: Port 5432, 6379, or 8080 already in use

**Solution**:

```bash
# Check what's using the port
sudo lsof -i :5432
sudo lsof -i :6379
sudo lsof -i :8080

# Change port in docker-compose.yml
# PostgreSQL: "5433:5432"
# Redis: "6380:6379"
# PgAdmin: "8081:80"

# Update API .env accordingly
DB_URL=postgresql://grant_user:grant_password@localhost:5433/grant
REDIS_PORT=6380
```

### Container Won't Start

**Problem**: Service fails to start

**Solution**:

```bash
# View detailed logs
docker-compose logs postgres

# Check container status
docker-compose ps

# Remove and recreate
docker-compose down
docker-compose up -d

# Check for conflicting volumes
docker volume ls
docker volume inspect grant_postgres_data
```

### Cannot Connect to Database

**Problem**: API can't connect to PostgreSQL

**Solutions**:

1. Verify PostgreSQL is running:

   ```bash
   docker-compose ps postgres
   ```

2. Test connection:

   ```bash
   docker exec -it grant-postgres psql -U grant_user -d grant
   ```

3. Check credentials match in both `.env` files

4. Verify database name matches:
   ```bash
   docker exec -it grant-postgres psql -U grant_user -l
   ```

### Redis Connection Issues

**Problem**: API can't connect to Redis

**Solutions**:

1. Verify Redis is running:

   ```bash
   docker-compose ps redis
   ```

2. Test connection:

   ```bash
   redis-cli -h localhost -p 6379 -a grant_redis_password ping
   ```

3. Check password matches in both `.env` files

4. Verify CACHE_STRATEGY is set to `redis` in `apps/api/.env`

### Data Persistence Issues

**Problem**: Data disappears after restart

**Solution**:

```bash
# Verify volumes exist
docker volume ls | grep grant

# Check volume mounts
docker inspect grant-postgres | grep Mounts -A 10

# Don't use `docker-compose down -v` (removes volumes)
# Use `docker-compose down` instead
```

## Integration with API

### Default Configuration

The infrastructure settings are pre-configured to work with the API defaults:

**Root `.env`** → **`apps/api/.env`**:

- `POSTGRES_DB=grant` → `DB_URL=postgresql://...@localhost:5432/grant`
- `POSTGRES_USER=grant_user` → `DB_URL=postgresql://grant_user:...`
- `POSTGRES_PASSWORD=grant_password` → `DB_URL=postgresql://...grant_password@...`
- `REDIS_PASSWORD=grant_redis_password` → `REDIS_PASSWORD=grant_redis_password`

### No Configuration Needed

If you use the defaults, you can start services and run the API immediately:

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Copy API config (defaults already match)
cp apps/api/.env.example apps/api/.env

# 3. Run API
cd apps/api && pnpm run dev
```

## Related Documentation

- **API Configuration**: `apps/api/src/config/README.md`
- **API Setup Guide**: `apps/api/CONFIG_MIGRATION.md`
- **Cache Setup**: `docs/advanced-topics/caching.md`
- **Quick Start Guide**: `docs/getting-started/quick-start.md`

## Support

Need help?

1. Check the logs: `docker-compose logs -f`
2. Verify services: `docker-compose ps`
3. Test connections manually (see commands above)
4. Review configuration alignment
5. Open an issue on GitHub

---

**Quick Commands Reference**:

```bash
# Setup
cp .env.example .env
docker-compose up -d

# Status
docker-compose ps
docker-compose logs -f

# Stop
docker-compose down

# Reset (WARNING: deletes data)
docker-compose down -v
docker-compose up -d

# Backup
docker exec grant-postgres pg_dump -U grant_user grant > backup.sql

# Access
# PostgreSQL: psql://grant_user:grant_password@localhost:5432/grant
# PgAdmin: http://localhost:8080
# Redis: redis-cli -h localhost -p 6379 -a grant_redis_password
```
