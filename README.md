# Grant

An open-source, multi-tenant RBAC platform with self-hosting capabilities.

## Compliance

<!-- compliance-badges:start -->

![SOC 2 Type II](badges/soc2.svg)
![GDPR](badges/gdpr.svg)
![HIPAA](badges/hipaa.svg)
![ISO 27001](badges/iso27001.svg)
![E2E Tests](badges/e2e-total.svg)

<!-- compliance-badges:end -->

## 🚀 Features

- **Multi-tenant RBAC** - Organization and project-level access control
- **Self-hosting** - Deploy with Docker Compose or your own infrastructure
- **Containerized** - Docker containers for web and API
- **Scalable** - Scale with your preferred stack
- **Open Source** - MIT licensed with active community

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Web App      │    │   API Server    │    │    Database     │
│   (Next.js)     │◄──►│    (Apollo)     │◄──►│  (PostgreSQL)   │
│   Container     │    │    Container    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Packages

### Published Packages (npm)

- **`@grantjs/core`** - Core RBAC system

### Self-Hosting Components

- **Web App** - Containerized Next.js frontend
- **API** - Containerized Apollo Server backend
- **Database** - PostgreSQL (self-hosted or managed)
- **Infrastructure** - Docker Compose for local and small deployments

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/logusgraphics/grant.git
cd grant

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## 📚 Documentation

### Open Source

- [Self-Hosting Guide](./docs/deployment/self-hosting.md)
- [Docker Configuration](./infrastructure/docker/README.md)
- [API Documentation](./docs/api/README.md)

### SaaS Enterprise

- [SaaS Features](./docs/saas/README.md)
- [Migration Guide](./docs/migration/README.md)
- [Feature Comparison](./docs/FEATURE_COMPARISON.md)
- [Enterprise Support](./docs/enterprise/README.md)

## 🔧 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint all packages

# Package management
pnpm publish:core     # Publish core package
pnpm clean            # Clean build outputs
```

### Working on Specific Components

```bash
# Web app
pnpm --filter grant-web dev

# API
pnpm --filter grant-api dev

# Core package
pnpm --filter @grantjs/core dev
```

## 🌐 Deployment Options

### Open Source (Self-Hosting)

- **Docker Compose** - Local development and small deployments
- **Manual Deployment** - Custom infrastructure (any cloud or on-premises)

### SaaS Enterprise (Hosted)

- **Managed Platform** - Fully hosted solution
- **Enterprise Features** - Advanced RBAC
- **Premium Support** - 24/7 assistance
- **Custom Integrations** - SSO, LDAP, SAML

## 💰 Pricing

### Open Source

- **Free Forever** - Complete self-hosting
- **Community Support** - GitHub issues, Discord
- **Core Features** - Basic RBAC

### SaaS Enterprise

- **Starter**: $99/month (up to 100 users)
- **Professional**: $299/month (up to 1,000 users)
- **Enterprise**: Custom pricing (unlimited users)

[View Full Feature Comparison](./docs/FEATURE_COMPARISON.md) | [SaaS Platform](https://grant.logus.graphics)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 👨‍💻 Author

**Alejandro Heredia**

- Email: ale@logus.graphics
- Website: https://logus.graphics
- GitHub: @logusgraphics
