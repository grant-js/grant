# What is Grant Platform?

Grant Platform is an open-source, multi-tenant RBAC/ACL (Role-Based Access Control / Access Control List) platform designed to provide comprehensive identity and access management for modern applications.

## Key Features

### 🔐 Multi-Tenant RBAC/ACL

- **Account-based multi-tenancy** with organization and project isolation
- **Flexible permission system** with action-based scoping
- **Role and group management** with inheritance and delegation
- **Real-time permission updates** across all connected systems

### 🏗️ Modern Architecture

- **Monorepo structure** with shared packages and independent apps
- **GraphQL API** with type-safe operations and subscriptions
- **PostgreSQL database** with Drizzle ORM and migrations
- **Containerized deployment** with Docker and AWS CloudFormation

### 🚀 Developer Experience

- **TypeScript-first** with full type safety
- **Comprehensive SDK** for Node.js, Express, Next.js, and more
- **Rich documentation** with examples and best practices
- **Active community** with Discord support and GitHub discussions

### 🌐 Deployment Options

- **Self-hosting** with CloudFormation templates
- **SaaS platform** with managed infrastructure
- **Docker containers** for easy deployment
- **AWS integration** with auto-scaling and monitoring

## Use Cases

### Internal RBAC

Manage employee access to internal systems, applications, and resources with fine-grained permissions and audit trails.

### Customer Portals

Provide secure, role-based access to customer-facing applications with organization and project-level isolation.

### API Access Control

Control access to your APIs with rate limiting, permission-based endpoints, and comprehensive audit logging.

### Compliance & Auditing

Meet compliance requirements with detailed audit logs, permission tracking, and data access monitoring.

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        WA[Web App<br/>Next.js Container]
    end
    
    subgraph "API Layer"
        AS[API Server<br/>Apollo Container]
    end
    
    subgraph "Data Layer"
        DB[Database<br/>PostgreSQL RDS]
    end
    
    subgraph "Core Packages"
        CP[Core Package]
        SP[Schema Package]
        DP[Database Package]
    end
    
    WA <--> AS
    AS <--> DB
    AS --> CP
    AS --> SP
    DB --> DP
    
    style WA fill:transparent,stroke:#2563eb,stroke-width:2px
    style AS fill:transparent,stroke:#2563eb,stroke-width:2px
    style DB fill:transparent,stroke:#2563eb,stroke-width:2px
    style CP fill:transparent,stroke:#10b981,stroke-width:2px
    style SP fill:transparent,stroke:#10b981,stroke-width:2px
    style DP fill:transparent,stroke:#10b981,stroke-width:2px
```

### Core Components

- **Web App** - Next.js frontend with authentication and user management
- **API Server** - Apollo GraphQL server with comprehensive RBAC/ACL
- **Database** - PostgreSQL with Drizzle ORM and migration system
- **Core Package** - Shared RBAC/ACL logic and middleware
- **Schema Package** - GraphQL schema and generated types
- **Database Package** - Database schemas, migrations, and utilities

## Why Grant Platform?

### For Developers

- **Type-safe** GraphQL API with generated TypeScript types
- **Comprehensive SDK** with middleware for popular frameworks
- **Rich documentation** with examples and best practices
- **Active development** with regular updates and community contributions

### For Organizations

- **Open source** with transparent development and community support
- **Self-hosting** option with no vendor lock-in
- **Scalable architecture** that grows with your needs
- **Compliance ready** with audit logging and data protection

### For DevOps

- **Containerized** deployment with Docker and Kubernetes support
- **CloudFormation templates** for one-click AWS deployment
- **Monitoring integration** with comprehensive metrics and logging
- **Automated scaling** with AWS Fargate and RDS

## System Architecture

Grant Platform follows a modern, scalable architecture designed for multi-tenancy and high performance:

```mermaid
graph TB
    subgraph "Client Applications"
        Web[Web App]
        Mobile[Mobile App]
        API_Client[API Client]
    end
    
    subgraph "Grant Platform"
        Gateway[API Gateway]
        Auth[Authentication Service]
        RBAC[RBAC Engine]
        DB[(PostgreSQL)]
    end
    
    subgraph "Infrastructure"
        AWS[AWS Cloud]
        Docker[Docker Containers]
        CF[CloudFormation]
    end
    
    Web --> Gateway
    Mobile --> Gateway
    API_Client --> Gateway
    
    Gateway --> Auth
    Gateway --> RBAC
    Auth --> DB
    RBAC --> DB
    
    Gateway --> AWS
    Auth --> Docker
    RBAC --> Docker
    DB --> AWS
```

## Multi-Tenancy Model

Our account-based multi-tenancy ensures complete isolation between organizations:

```mermaid
graph LR
    subgraph "Account: Acme Corp"
        A1[Organization A]
        A2[Project Alpha]
        A3[Project Beta]
        A4[Users A1-A10]
    end
    
    subgraph "Account: Beta Inc"
        B1[Organization B]
        B2[Project Gamma]
        B3[Project Delta]
        B4[Users B1-B15]
    end
    
    A1 --> A2
    A1 --> A3
    A2 --> A4
    A3 --> A4
    
    B1 --> B2
    B1 --> B3
    B2 --> B4
    B3 --> B4
    
    A1 -.->|Isolated| B1
    A2 -.->|Isolated| B2
    A4 -.->|Isolated| B4
```

## Permission Flow

Here's how permissions are evaluated in Grant Platform:

```mermaid
flowchart TD
    Start([User Request]) --> Auth{Authenticated?}
    Auth -->|No| Deny[Access Denied]
    Auth -->|Yes| CheckRole{Has Role?}
    CheckRole -->|No| Deny
    CheckRole -->|Yes| CheckPerm{Has Permission?}
    CheckPerm -->|No| Deny
    CheckPerm -->|Yes| CheckScope{In Scope?}
    CheckScope -->|No| Deny
    CheckScope -->|Yes| Allow[Access Granted]
    
    style Start stroke:#2563eb,stroke-width:3px
    style Allow stroke:#10b981,stroke-width:2px
    style Deny stroke:#ef4444,stroke-width:2px
```

## Getting Started

Ready to get started with Grant Platform? Here are your next steps:

1. **[Quick Start Guide](/quick-start)** - Get up and running in minutes
2. **[Architecture Deep Dive](/architecture/overview)** - Understand the system design
3. **[Self-Hosting Setup](/deployment/self-hosting)** - Deploy on your infrastructure
4. **[API Reference](/api/)** - Explore the GraphQL API

## Community & Support

- **GitHub** - [Source code and issues](https://github.com/logusgraphics/grant-platform)
- **Discord** - [Community discussions](https://discord.gg/grant-platform)
- **Email** - [Support and inquiries](mailto:support@grant.logus.graphics)

---

**Next:** [Quick Start Guide](/quick-start) to get Grant Platform running locally or in production.
