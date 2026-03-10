---
title: Environment Setup
description: Setting up different environments for Grant deployment
---

# Environment Setup

This guide covers setting up different environments (development, staging, production) for Grant.

## Environment Overview

Grant supports multiple deployment environments:

- **Development** - Local development with hot reload
- **Staging** - Pre-production testing environment
- **Production** - Live production environment

## Environment Configuration

### Development Environment

Optimized for local development with debugging enabled.

**Infrastructure** (Docker Compose):

```bash
# .env (root)
POSTGRES_DB=grant
POSTGRES_USER=grant_user
POSTGRES_PASSWORD=grant_password
REDIS_PASSWORD=grant_redis_password
```

**Application**:

```bash
# apps/api/.env
NODE_ENV=development
APP_PORT=4000

# Database
DB_URL=postgresql://grant_user:grant_password@localhost:5432/grant
DB_LOG_QUERIES=true

# Cache (in-memory for single instance)
CACHE_STRATEGY=memory

# GraphQL/Apollo
APOLLO_INTROSPECTION=true
APOLLO_PLAYGROUND=true
APOLLO_INCLUDE_STACKTRACE=true

# Security (relaxed for development)
SECURITY_FRONTEND_URL=http://localhost:3000
SECURITY_ENABLE_RATE_LIMIT=false
```

**Start development environment:**

```bash
# Start infrastructure
docker-compose up -d

# Start API
cd apps/api && pnpm run dev

# Start web app (in another terminal)
cd apps/web && pnpm run dev
```

### Staging Environment

Pre-production environment for testing before going live.

**Infrastructure** (Managed Services):

Use managed PostgreSQL and Redis from your preferred provider (e.g. cloud or self-hosted).

**Application**:

```bash
# apps/api/.env (staging)
NODE_ENV=staging
APP_PORT=4000

# Database (managed)
DB_URL=postgresql://user:pass@staging-db-host:5432/grant
DB_LOG_QUERIES=false

# Cache (Redis for multi-instance)
CACHE_STRATEGY=redis
REDIS_HOST=staging-redis.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=staging-redis-password
REDIS_ENABLE_TLS=true

# GraphQL/Apollo
APOLLO_INTROSPECTION=false
APOLLO_PLAYGROUND=false
APOLLO_INCLUDE_STACKTRACE=false

# Security (production-like)
SECURITY_FRONTEND_URL=https://staging.yourdomain.com
SECURITY_ENABLE_RATE_LIMIT=true
SECURITY_RATE_LIMIT_MAX=1000  # Higher than prod for testing
```

### Production Environment

Hardened configuration for live deployment.

**Application**:

```bash
# apps/api/.env (production)
NODE_ENV=production
APP_PORT=4000

# Database (managed RDS with read replicas)
DB_URL=postgresql://user:pass@prod-db.amazonaws.com:5432/grant
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_LOG_QUERIES=false

# Cache (Redis cluster)
CACHE_STRATEGY=redis
REDIS_HOST=prod-redis-cluster.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=production-redis-strong-password
REDIS_ENABLE_TLS=true

# GraphQL/Apollo (security hardened)
APOLLO_INTROSPECTION=false
APOLLO_PLAYGROUND=false
APOLLO_INCLUDE_STACKTRACE=false

# Security (strict)
SECURITY_FRONTEND_URL=https://yourdomain.com
SECURITY_ENABLE_HELMET=true
SECURITY_ENABLE_RATE_LIMIT=true
SECURITY_RATE_LIMIT_MAX=100
SECURITY_RATE_LIMIT_WINDOW_MINUTES=15
```

## Environment-Specific Files

### Directory Structure

```
grant/
├── .env.example                 # Infrastructure template
├── .env.development            # Development overrides
├── .env.staging                # Staging overrides
├── .env.production             # Production overrides
├── apps/api/
│   ├── .env.example            # API template
│   ├── .env.development        # Development API config
│   ├── .env.staging            # Staging API config
│   └── .env.production         # Production API config
```

### Loading Environment Files

The API automatically loads the appropriate `.env` file based on `NODE_ENV`:

```typescript
// Automatically handled by apps/api/src/config/env.config.ts
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
dotenv.config({ path: '.env' }); // Fallback to default
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm run build
        env:
          NODE_ENV: staging

      - name: Deploy to staging
        run: |
          # Your deployment script
          ./scripts/deploy-staging.sh
        env:
          DB_URL: ${{ secrets.STAGING_DB_URL }}
          REDIS_PASSWORD: ${{ secrets.STAGING_REDIS_PASSWORD }}
```

### Environment Secrets

Store sensitive values in your CI/CD platform:

**GitHub Secrets:**

- `STAGING_DB_URL`
- `STAGING_REDIS_PASSWORD`
- `PRODUCTION_DB_URL`
- `PRODUCTION_REDIS_PASSWORD`

## Validation

Each environment should validate its configuration on startup:

```bash
# Development - Should start without errors
cd apps/api && pnpm run dev

# Staging/Production - Validates stricter requirements
cd apps/api && NODE_ENV=production pnpm run start
```

**Validation checks:**

- Required environment variables are set
- Secrets are not default values in production
- Database connection is valid
- Redis connection (if using) is valid

## Best Practices

### 1. Separate Secrets

Use different secrets for each environment:

```bash
# Generate unique secrets
openssl rand -base64 32  # For each environment
```

### 2. Environment Parity

Keep environments as similar as possible:

- ✅ Same database schema
- ✅ Same application version
- ✅ Same infrastructure type (managed services)
- ❌ Different data
- ❌ Different secrets
- ❌ Different scale

### 3. Configuration as Code

Store environment configurations in version control:

```bash
# Safe to commit (no secrets)
.env.example
.env.development.example
.env.staging.example
.env.production.example
```

### 4. Secrets Management

Never commit actual secrets:

```bash
# gitignored
.env
.env.development
.env.staging
.env.production
.env.local
.env.*.local
```

Use secret management services:

- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

### 5. Testing Configuration

Test configuration before deploying:

```bash
# Dry run
NODE_ENV=staging node -e "require('./dist/config/env.config').validateConfig()"
```

## Troubleshooting

### Wrong Environment Loaded

**Symptom**: Development settings in production

**Fix**:

```bash
# Explicitly set NODE_ENV
export NODE_ENV=production
node dist/server.js
```

### Missing Environment Variables

**Symptom**: Configuration validation errors

**Fix**:

1. Check `.env` file exists
2. Verify all required variables are set
3. Check variable names match exactly
4. Ensure no typos in `.env` file

### Database Connection Fails

**Symptom**: Cannot connect to database

**Fix**:

```bash
# Test connection manually
psql "$DB_URL"

# Check network access
telnet db-host 5432

# Verify credentials
echo $DB_URL
```

## Related Documentation

- **[Configuration](/getting-started/configuration)** - Complete configuration reference
- **[Docker Deployment](/deployment/docker)** - Local infrastructure setup
- **[Self-Hosting](/deployment/self-hosting)** - Self-hosting guide

---

**Next Steps:**

- Choose your target environment
- Configure environment-specific variables
- Test configuration locally
- Deploy to your target environment
