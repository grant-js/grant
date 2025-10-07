# Grant Platform

An open-source, multi-tenant RBAC/ACL platform with self-hosting capabilities via AWS CloudFormation.

## 🚀 Features

- **Multi-tenant RBAC/ACL** - Organization and project-level access control
- **Self-hosting** - Deploy with AWS CloudFormation templates
- **Containerized** - Docker containers for web and API
- **Scalable** - Auto-scaling with AWS Fargate
- **Open Source** - MIT licensed with active community

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   API Server     │    │   Database      │
│   (Next.js)     │◄──►│   (Apollo)      │◄──►│   (PostgreSQL)  │
│   Container     │    │   Container      │    │   (RDS)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Packages

### Published Packages (npm)

- **`@logusgraphics/grant-core`** - Core RBAC/ACL system

### Self-Hosting Components

- **Web App** - Containerized Next.js frontend
- **API** - Containerized Apollo Server backend
- **Database** - AWS RDS PostgreSQL cluster
- **Infrastructure** - CloudFormation templates

## 🚀 Quick Start

### Self-Hosting (AWS)

1. **Launch CloudFormation Stack**

   ```bash
   aws cloudformation create-stack \
     --stack-name grant-platform \
     --template-body file://infrastructure/cloudformation/main.yaml \
     --parameters file://infrastructure/cloudformation/parameters/dev.json \
     --capabilities CAPABILITY_IAM
   ```

2. **Configure via AWS Console**
   - Use the CloudFormation wizard
   - Configure parameters
   - Launch the stack

### Local Development

```bash
# Clone repository
git clone https://github.com/logusgraphics/grant-platform.git
cd grant-platform

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## 📚 Documentation

### Open Source

- [Self-Hosting Guide](./docs/self-hosting/README.md)
- [CloudFormation Setup](./infrastructure/cloudformation/README.md)
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
pnpm --filter @logusgraphics/grant-core dev
```

## 🌐 Deployment Options

### Open Source (Self-Hosting)

- **AWS CloudFormation** - One-click deployment
- **Docker Compose** - Local development
- **Manual Deployment** - Custom infrastructure

### SaaS Enterprise (Hosted)

- **Managed Platform** - Fully hosted solution
- **Enterprise Features** - Advanced RBAC/ACL
- **Premium Support** - 24/7 assistance
- **Custom Integrations** - SSO, LDAP, SAML

## 💰 Pricing

### Open Source

- **Free Forever** - Complete self-hosting
- **Community Support** - GitHub issues, Discord
- **Core Features** - Basic RBAC/ACL

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
