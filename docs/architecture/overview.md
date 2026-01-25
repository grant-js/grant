---
title: Architecture Overview
description: Understanding the system design and core components of Grant
---

# Architecture Overview

Grant follows a modern, scalable architecture designed for multi-tenancy and high performance.

## System Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        Web[Web App]
        Mobile[Mobile App]
        API_Client[API Client]
    end

    subgraph "Grant"
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

## Core Components

### Frontend Layer

- **Web App** - Next.js frontend with authentication and user management
- **Mobile App** - React Native mobile application (future)
- **API Client** - SDK for integrating with external applications

### API Layer

- **API Server** - Apollo GraphQL server with comprehensive RBAC/ACL
- **Authentication Service** - JWT-based authentication with multiple providers
- **RBAC Engine** - Permission evaluation and access control

### Data Layer

- **Database** - PostgreSQL with Drizzle ORM and migration system
- **Cache Layer** - Redis for session management and performance
- **File Storage** - AWS S3 for document and asset storage

### Core Packages

- **Core Package** - Shared RBAC/ACL logic and middleware
- **Schema Package** - GraphQL schema and generated types
- **Database Package** - Database schemas, migrations, and utilities
- **Constants Package** - Shared constants and enums

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

Here's how permissions are evaluated in Grant:

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

## Technology Stack

### Backend

- **Node.js** - Runtime environment
- **TypeScript** - Type-safe development
- **Apollo Server** - GraphQL API server
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage

### Frontend

- **Next.js** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Apollo Client** - GraphQL client
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Infrastructure

- **Docker** - Containerization
- **AWS** - Cloud infrastructure
- **CloudFormation** - Infrastructure as code
- **GitHub Actions** - CI/CD pipeline

## Design Principles

### 1. Type Safety First

- Full TypeScript coverage across the stack
- Generated types from GraphQL schema
- Compile-time error checking

### 2. Modular Architecture

- Monorepo structure with shared packages
- Clear separation of concerns
- Reusable components and utilities

### 3. Security by Design

- Multi-tenant isolation
- Role-based access control
- Comprehensive audit logging
- Input validation and sanitization

### 4. Performance Optimization

- Efficient database queries
- Caching strategies
- Optimized GraphQL field selection
- CDN for static assets

### 5. Developer Experience

- Comprehensive documentation
- Type-safe APIs
- Hot reloading in development
- Automated testing and deployment

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers
- Database read replicas
- Load balancing across instances
- Microservices architecture (future)

### Performance Optimization

- Database indexing strategies
- Query optimization
- Caching layers
- CDN integration

### Monitoring and Observability

- Application performance monitoring
- Error tracking and alerting
- Business metrics and analytics
- Health checks and uptime monitoring

## Future Architecture Evolution

### Phase 1: Current Monolith

- Single API server
- Shared database
- Basic multi-tenancy

### Phase 2: Service Separation

- Separate authentication service
- Dedicated RBAC service
- Event-driven architecture

### Phase 3: Microservices

- Domain-driven service boundaries
- Event sourcing for audit trails
- Advanced caching strategies
- Global distribution

---

**Next:** Learn about [Multi-Tenancy](/architecture/multi-tenancy) to understand how organizations and projects are isolated.
