---
title: Configuration
description: Comprehensive configuration guide for Grant
---

# Configuration

This guide covers the standardized configuration system for Grant, including environment variables, naming conventions, and best practices.

## Overview

Grant uses a **centralized, type-safe configuration system** that provides:

- Single source of truth for all configuration
- Type safety with full TypeScript support
- Runtime validation with helpful error messages
- Clear naming conventions with prefixes
- Comprehensive defaults for easy development
- Environment-specific configurations

## Quick Start

### 1. Setup Environment File

The API includes a comprehensive `.env.example` file with all available configuration options:

```bash
# Copy the example file
cp apps/api/.env.example apps/api/.env

# Edit with your values
vim apps/api/.env
```

### 2. Required Configuration

At minimum, you need to set:

```bash
# Database connection (required)
DB_URL="postgresql://grant_user:grant_password@localhost:5432/grant"

# JWT secret (MUST change in production)
JWT_SECRET="your-super-secret-key-change-in-production"

# Frontend URL for CORS (required in production)
SECURITY_FRONTEND_URL="http://localhost:3000"
```

### 3. Start the Server

```bash
cd apps/api
pnpm run dev
```

You'll see a configuration summary on startup:

```
📋 Configuration Summary:
   Environment: development
   Port: 4000
   Cache Strategy: memory
   Database: configured
   JWT Expiration: 15min / 30d
```

## Environment Variable Naming Conventions

All environment variables follow a **prefix-based naming convention** for clarity and organization:

| Prefix       | Purpose                        | Examples                                            |
| ------------ | ------------------------------ | --------------------------------------------------- |
| `APP_*`      | Application-level settings     | `APP_PORT`                                          |
| `DB_*`       | Database configuration         | `DB_URL`, `DB_POOL_MAX`                             |
| `JWT_*`      | JWT authentication             | `JWT_SECRET`, `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES` |
| `AUTH_*`     | Authentication & authorization | `AUTH_OTP_VALIDITY_MINUTES`                         |
| `CACHE_*`    | Cache strategy & settings      | `CACHE_STRATEGY`, `CACHE_DEFAULT_TTL`               |
| `REDIS_*`    | Redis configuration            | `REDIS_HOST`, `REDIS_PORT`                          |
| `SECURITY_*` | Security settings              | `SECURITY_FRONTEND_URL`, `SECURITY_ENABLE_CSRF`     |
| `APOLLO_*`   | GraphQL/Apollo settings        | `APOLLO_INTROSPECTION`                              |
| `FEATURE_*`  | Feature flags (future)         | `FEATURE_AUDIT_LOGGING`                             |
| (none)       | Standard Node.js               | `NODE_ENV`                                          |

### Why Use Prefixes?

1. **Clarity** - Immediately understand what each variable controls
2. **Grouping** - Related variables are organized logically
3. **Avoid Collisions** - Prevents conflicts with system variables
4. **Easy Searching** - `grep "DB_" .env` shows all database config
5. **Scalability** - Easy to add new categories as the system grows

## Configuration Sections

### Application Settings

Core application configuration:

```bash
# Server port (default: 4000)
APP_PORT=4000

# Node environment: development | production | test
NODE_ENV=development
```

### Database Configuration

PostgreSQL database settings:

```bash
# Database connection string (required)
# Format: postgresql://username:password@host:port/database
DB_URL="postgresql://grant_user:grant_password@localhost:5432/grant"

# Connection pool settings
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_CONNECTION_TIMEOUT=30000  # milliseconds
DB_QUERY_TIMEOUT=60000       # milliseconds

# Enable query logging (default: true in development)
DB_LOG_QUERIES=true
```

::: tip Legacy Support
The old `DATABASE_URL` variable is still supported for backward compatibility, but `DB_URL` is now the standard.
:::

### JWT Configuration

JSON Web Token authentication settings:

```bash
# JWT secret key for signing tokens (REQUIRED - change in production!)
JWT_SECRET="your-super-secret-key-change-in-production"

# Access token expiration in minutes (default: 15)
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES=15

# Refresh token expiration in days (default: 30)
JWT_REFRESH_TOKEN_EXPIRATION_DAYS=30
```

::: warning Production Security
In production, `JWT_SECRET` **must** be:

- At least 32 characters long
- Cryptographically random
- Never committed to version control
- Rotated regularly
  :::

### Authentication Settings

Additional authentication and authorization configuration:

```bash
# Provider verification token expiration in days (default: 7)
AUTH_PROVIDER_VERIFICATION_EXPIRATION_DAYS=7

# OTP (One-Time Password) validity in minutes (default: 5)
AUTH_OTP_VALIDITY_MINUTES=5

# Maximum failed login attempts before lockout (default: 5)
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5

# Account lockout duration in minutes (default: 15)
AUTH_LOCKOUT_DURATION_MINUTES=15
```

### Cache Configuration

Caching strategy for performance optimization:

```bash
# Cache strategy: memory | redis
# - memory: In-memory cache (single instance only)
# - redis: Redis cache (for distributed/multi-instance)
CACHE_STRATEGY=memory

# Default cache TTL in seconds (default: 3600 = 1 hour)
CACHE_DEFAULT_TTL=3600

# Maximum cache size in bytes for in-memory cache (default: 100MB)
CACHE_MAX_SIZE=104857600
```

::: tip When to Use Redis
Use `CACHE_STRATEGY=redis` when:

- Running multiple API instances (load balancing)
- Need to share cache across instances
- Deploying to production with horizontal scaling
  :::

### Redis Configuration

Redis server settings (only needed if `CACHE_STRATEGY=redis`):

```bash
# Redis server hostname
REDIS_HOST=localhost

# Redis server port (default: 6379)
REDIS_PORT=6379

# Redis authentication password (recommended in production)
REDIS_PASSWORD=your_secure_redis_password

# Redis database number (default: 0)
REDIS_DB=0

# Redis key prefix for namespacing (default: grant:)
REDIS_KEY_PREFIX=grant:

# Redis connection timeout in milliseconds (default: 10000)
REDIS_CONNECTION_TIMEOUT=10000

# Enable TLS for Redis connection (default: false, recommended for production)
REDIS_ENABLE_TLS=false
```

### Security Configuration

Security and CORS settings:

```bash
# Frontend URL for CORS (REQUIRED in production)
SECURITY_FRONTEND_URL=http://localhost:3000

# Additional allowed origins for CORS (comma-separated)
# Example: https://app.example.com,https://admin.example.com
SECURITY_ADDITIONAL_ORIGINS=

# Enable CSRF protection (default: true in production)
SECURITY_ENABLE_CSRF=false

# Enable Helmet security headers (default: true)
SECURITY_ENABLE_HELMET=true

# Enable rate limiting (default: true in production)
SECURITY_ENABLE_RATE_LIMIT=false

# Rate limit: maximum requests per window (default: 100)
SECURITY_RATE_LIMIT_MAX=100

# Rate limit: time window in minutes (default: 15)
SECURITY_RATE_LIMIT_WINDOW_MINUTES=15

# Rate limit for auth endpoints (login, refresh, cli-callback, token): max per window (default: 20)
SECURITY_RATE_LIMIT_AUTH_MAX=20

# Rate limit for auth endpoints: time window in minutes (default: 15)
SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES=15

# Per-tenant rate limiting (noisy neighbor protection). When enabled, limits by scope (default: false)
SECURITY_RATE_LIMIT_PER_TENANT_ENABLED=false

# Per-tenant rate limit: maximum requests per window per tenant (default: 200)
SECURITY_RATE_LIMIT_PER_TENANT_MAX=200

# Per-tenant rate limit: time window in minutes (default: 15)
SECURITY_RATE_LIMIT_PER_TENANT_WINDOW_MINUTES=15

# API Key for external service authentication (optional)
SECURITY_API_KEY=
```

### Apollo/GraphQL Configuration

GraphQL and Apollo Server settings:

```bash
# Enable GraphQL introspection (default: true in development)
APOLLO_INTROSPECTION=true

# Enable CSRF prevention (default: true in production)
APOLLO_CSRF_PREVENTION=false

# Enable GraphQL playground (default: true in development)
APOLLO_PLAYGROUND=true

# Include stack traces in GraphQL errors (default: true in development)
APOLLO_INCLUDE_STACKTRACE=true
```

## Using Configuration in Code

### Modern Configuration System

The API uses a centralized configuration object that's type-safe and validated:

```typescript
import { config } from '@/config';

// Access configuration values with full TypeScript support
const port = config.app.port;
const dbUrl = config.db.url;
const jwtSecret = config.jwt.secret;
const cacheStrategy = config.cache.strategy; // 'memory' | 'redis'

// Environment-aware booleans
if (config.app.isProduction) {
  // Production-specific code
}

if (config.app.isDevelopment) {
  // Development-specific code
}
```

### Configuration Validation

The system validates configuration on startup:

```typescript
import { validateConfig, printConfigSummary } from '@/config';

// Validate configuration (throws on error)
validateConfig();

// Print safe summary (no secrets)
printConfigSummary();
```

**Validation rules include:**

- JWT secret must not be default value in production
- Database URL is required
- Redis host is required when using Redis cache
- Security settings are enforced in production

### Configuration Object Structure

All configuration is accessed through a single, type-safe object:

```typescript
// ✅ Single import for all configuration
import { config } from '@/config';

// Access nested configuration with full TypeScript support
const jwtSecret = config.jwt.secret;
const cacheStrategy = config.cache.strategy;
const port = config.app.port;
const dbUrl = config.db.url;

// Helper objects for middleware
import { CORS_CONFIG, HELMET_CONFIG, SERVER_CONFIG } from '@/config';
app.use(cors(CORS_CONFIG));
app.use(helmet(HELMET_CONFIG));
```

## Environment-Specific Configuration

### Development Environment

Optimized for local development with debugging enabled:

```bash
NODE_ENV=development
APP_PORT=4000
DB_URL=postgresql://grant_user:grant_password@localhost:5432/grant
JWT_SECRET=dev-secret-key
CACHE_STRATEGY=memory
DB_LOG_QUERIES=true
APOLLO_INTROSPECTION=true
APOLLO_PLAYGROUND=true
APOLLO_INCLUDE_STACKTRACE=true
```

### Production Environment

Hardened for production with security features enabled:

```bash
NODE_ENV=production
APP_PORT=4000
DB_URL=postgresql://prod_user:secure_password@db.example.com:5432/grant
JWT_SECRET=your-production-secret-min-32-chars
CACHE_STRATEGY=redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password
REDIS_ENABLE_TLS=true
DB_LOG_QUERIES=false
APOLLO_INTROSPECTION=false
APOLLO_PLAYGROUND=false
APOLLO_INCLUDE_STACKTRACE=false
SECURITY_FRONTEND_URL=https://yourdomain.com
SECURITY_ENABLE_CSRF=true
SECURITY_ENABLE_RATE_LIMIT=true
```

### Test Environment

Isolated configuration for testing:

```bash
NODE_ENV=test
APP_PORT=4001
DB_URL=postgresql://test_user:test_pass@localhost:5432/grant_test
JWT_SECRET=test-secret-key
CACHE_STRATEGY=memory
```

## Configuration Reference

### Complete Variable List

See the full `.env.example` file in `apps/api/.env.example` for:

- All available variables
- Detailed descriptions
- Default values
- Required vs optional settings
- Production recommendations

### Developer Reference

For developers working on the API:

- **Main Config File**: `apps/api/src/config/env.config.ts` - TypeScript configuration implementation
- **Environment Example**: `apps/api/.env.example` - Complete list of all variables with descriptions
- **Type Definitions**: Full TypeScript support with autocomplete for all config values

## Best Practices

### 1. Never Commit Secrets

**❌ Never commit `.env` files to version control**

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
```

Use `.env.example` as a template for documentation.

### 2. Use Strong Secrets in Production

- **JWT_SECRET**: Minimum 32 characters, cryptographically random
- **REDIS_PASSWORD**: Strong password, regularly rotated
- **Database passwords**: Use strong, unique passwords
- **Rotate secrets regularly** (every 90 days recommended)

```bash
# Generate a secure secret
openssl rand -base64 32
```

### 3. Follow the Naming Convention

Use the appropriate prefix for all new variables:

```bash
# ✅ Good
DB_POOL_MAX=20
JWT_SECRET=...
CACHE_STRATEGY=redis

# ❌ Bad
POOL_MAX=20
SECRET=...
STRATEGY=redis
```

### 4. Provide Sensible Defaults

When adding new configuration:

- Make development easy (sensible defaults)
- Require critical values in production
- Document in `.env.example`

### 5. Validate Configuration

Always validate configuration on startup:

```typescript
// apps/api/src/server.ts
validateConfig(); // Throws on invalid config
printConfigSummary(); // Shows configuration (no secrets)
```

### 6. Use Environment-Specific Settings

Different settings for different environments:

- **Development**: Verbose logging, debugging enabled
- **Production**: Security hardened, minimal logging
- **Test**: Isolated database, fast timeouts

### 7. Document New Variables

When adding configuration:

1. Add to `apps/api/src/config/env.config.ts`
2. Update `apps/api/.env.example` with description
3. Update this documentation page
4. Follow the naming convention

## Troubleshooting

### Configuration Not Loading

**Problem**: Environment variables not being read

**Solutions**:

1. Ensure `.env` file is in `apps/api/` directory
2. Check file permissions (`chmod 600 .env`)
3. Verify no syntax errors in `.env` file
4. Restart the server after changes

### Validation Errors on Startup

**Problem**: Server fails to start with validation error

```
Error: Configuration validation failed:
  - JWT_SECRET must be set to a secure value in production
```

**Solutions**:

1. Review the error message carefully
2. Update the specified variable in `.env`
3. Ensure production secrets are secure
4. Check `.env.example` for guidance

### Redis Connection Issues

**Problem**: Cannot connect to Redis when using `CACHE_STRATEGY=redis`

**Solutions**:

1. Verify Redis is running: `docker ps | grep redis`
2. Check `REDIS_HOST` and `REDIS_PORT` settings
3. Verify `REDIS_PASSWORD` matches Redis configuration
4. Test connection: `redis-cli -h <host> -p <port> -a <password> ping`

### CORS Errors

**Problem**: Frontend cannot access API

**Solutions**:

1. Set `SECURITY_FRONTEND_URL` to your frontend URL
2. Add additional origins to `SECURITY_ADDITIONAL_ORIGINS`
3. Check CORS settings in browser console
4. Verify `NODE_ENV` matches expected environment

## Migration from Old System

If upgrading from an older version:

### Variable Name Changes

| Old Name                          | New Name                              |
| --------------------------------- | ------------------------------------- |
| `PORT`                            | `APP_PORT`                            |
| `DATABASE_URL`                    | `DB_URL` (both work)                  |
| `ACCESS_TOKEN_EXPIRATION_MINUTES` | `JWT_ACCESS_TOKEN_EXPIRATION_MINUTES` |
| `REFRESH_TOKEN_EXPIRATION_DAYS`   | `JWT_REFRESH_TOKEN_EXPIRATION_DAYS`   |
| `OTP_VALIDITY_MINUTES`            | `AUTH_OTP_VALIDITY_MINUTES`           |
| `FRONTEND_URL`                    | `SECURITY_FRONTEND_URL`               |

::: tip Backward Compatibility
All old variable names still work! Migration is optional but recommended.
:::

## Related Documentation

- **[Docker Deployment](/deployment/docker)** - Docker Compose infrastructure setup
- **[Cache System Setup](/advanced-topics/caching-setup)** - Detailed caching configuration
- **[Caching System](/advanced-topics/caching)** - Cache system architecture
- **[Installation Guide](/getting-started/installation)** - Initial setup instructions
- **[Quick Start](/getting-started/quick-start)** - Get started quickly
- **[Development Guide](/development/guide)** - Development best practices
- **[Security Audit](/development/security-audit)** - Security considerations

## Support

Need help with configuration?

1. **Check the examples**: Review `apps/api/.env.example` for all options
2. **Review the config file**: See `apps/api/src/config/env.config.ts` for implementation details
3. **This documentation**: All configuration is documented on this page
4. **Open an issue**: [GitHub Issues](https://github.com/logusgraphics/grant/issues)

---

**Next:** Learn about the [Development Guide](/development/guide) to understand development practices.
