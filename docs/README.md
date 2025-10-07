# Documentation Index

This directory contains all the documentation for Identity Central. Each document focuses on a specific aspect of the system to keep information organized and digestible.

## 📚 Complete Documentation Overview

### 🏗️ Architecture & Design

- **[Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md)** - Complete multi-tenancy architecture, account-based design, organization/project isolation, and implementation strategy
- **[Relationship Model & Natural Hierarchies](./RELATIONSHIP_MODEL.md)** - Entity relationships, RBAC system design, permission resolution, and security considerations
- **[Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md)** - GraphQL performance optimization techniques and database query optimization

### 🗄️ Database & Backend

- **[Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)** - Database schema, implementation details, migration strategies, and seeding system

### 🛠️ Development & Implementation

- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Project structure, best practices, scaffolding guidelines, and collaboration workflows
- **[Testing Guide](./TESTING.md)** - Testing framework setup, writing tests, coverage reporting, and testing best practices
- **[Components Documentation](./COMPONENTS.md)** - Component architecture, usage guidelines, and implementation details

## 🚀 Quick Start Documentation

### For New Developers

**Essential reading order:**

1. **[Main README](../README.md)** - Project overview, quick start, and basic setup
2. **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Project structure and development workflow
3. **[PostgreSQL Implementation](./POSTGRES_IMPLEMENTATION.md)** - Database setup and seeding
4. **[Testing Guide](./TESTING.md)** - Testing practices and framework

### For Database Developers

**Database-focused documentation:**

1. **[Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)** - Complete database implementation guide
2. **[Relationship Model](./RELATIONSHIP_MODEL.md)** - Entity relationships and data design
3. **[Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md)** - Query optimization

### For Frontend Developers

**Frontend-focused documentation:**

1. **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Project structure and patterns
2. **[Components Documentation](./COMPONENTS.md)** - Component architecture
3. **[Testing Guide](./TESTING.md)** - Frontend testing practices
4. **[Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md)** - Understanding the data model

### For Architects & System Designers

**Architecture-focused documentation:**

1. **[Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md)** - Core architectural decisions
2. **[Relationship Model](./RELATIONSHIP_MODEL.md)** - Data architecture and relationships
3. **[Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md)** - Performance architecture
4. **[Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)** - Database architecture

## 📋 Documentation by Category

### 🏛️ System Architecture

| Document                                                          | Description                                         | Audience                        |
| ----------------------------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| [Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md)   | Account-based multi-tenancy, organization isolation | Architects, Backend Developers  |
| [Relationship Model](./RELATIONSHIP_MODEL.md)                     | Entity relationships, RBAC design, security         | Architects, Database Developers |
| [Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md) | GraphQL performance, query optimization             | Backend Developers, Architects  |

### 🗃️ Database & Data Management

| Document                                                  | Description                                   | Audience                    |
| --------------------------------------------------------- | --------------------------------------------- | --------------------------- |
| [Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md) | Database schema, migrations, seeding workflow | Database Developers, DevOps |

### 💻 Development & Testing

| Document                                    | Description                                  | Audience            |
| ------------------------------------------- | -------------------------------------------- | ------------------- |
| [Development Guide](./DEVELOPMENT_GUIDE.md) | Project structure, best practices, workflows | All Developers      |
| [Testing Guide](./TESTING.md)               | Testing framework, practices, coverage       | All Developers      |
| [Components Documentation](./COMPONENTS.md) | Component architecture, UI patterns          | Frontend Developers |

### 🚀 Getting Started

| Document                                                | Description                                 | Audience       |
| ------------------------------------------------------- | ------------------------------------------- | -------------- |
| [Main README](../README.md)                             | Project overview, quick start, installation | Everyone       |
| [Package Scripts Reference](#package-scripts-reference) | All available npm scripts and commands      | All Developers |

## 📦 Package Scripts Reference

### Development Scripts

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run test            # Run tests with Vitest
```

### Database Scripts

```bash
npm run db:generate     # Generate Drizzle migrations
npm run db:migrate      # Apply database migrations
npm run db:seed         # Seed with fake data
npm run db:seed:json    # Import from JSON files
npm run db:reset        # Reset database
```

### Docker Scripts

```bash
npm run docker:up       # Start database containers
npm run docker:down     # Stop database containers
npm run docker:logs     # View container logs
```

### GraphQL Scripts

```bash
npm run generate        # Generate GraphQL types
```

### Documentation Scripts

```bash
npm run docs:check      # Verify all documentation files exist
```

For detailed information about database scripts, see the **[Database Scripts Guide](../scripts/README.md)**.

## 🗂️ Project Structure Overview

```
identity-central/
├── apps/                  # Applications
│   ├── api/              # Apollo Server API
│   │   └── tests/        # API tests
│   └── web/              # Next.js web app
│       └── tests/        # Web app tests (future)
├── packages/             # Shared packages
│   └── @logusgraphics/   # Scoped packages
├── docs/                 # 📚 All documentation (this directory)
└── public/              # Static assets
```

## 🔄 Database Workflow Quick Reference

### Complete Setup

```bash
# 1. Start database
npm run docker:up

# 2. Generate schema migrations
npm run db:generate

# 3. Apply migrations
npm run db:migrate

# 4. Seed with data (choose one)
npm run db:seed          # Generate fake data
npm run db:seed:json     # Import from JSON files
```

### Development Workflow

```bash
# Reset and reseed for testing
npm run db:reset
npm run db:seed

# Check database status
npm run docker:logs
```

For complete database documentation, see **[Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)**.

## 🎯 Common Tasks & Documentation

### Setting Up Development Environment

1. **[Main README](../README.md)** - Basic installation and setup
2. **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Detailed development setup
3. **[PostgreSQL Implementation](./POSTGRES_IMPLEMENTATION.md)** - Database setup

### Understanding the System Architecture

1. **[Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md)** - Core architecture
2. **[Relationship Model](./RELATIONSHIP_MODEL.md)** - Data relationships
3. **[Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md)** - Performance design

### Working with the Database

1. **[Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)** - Complete database guide
2. **[Relationship Model](./RELATIONSHIP_MODEL.md)** - Understanding data structure

### Testing and Quality Assurance

1. **[Testing Guide](./TESTING.md)** - Testing framework and practices
2. **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Code quality standards
3. **[Components Documentation](./COMPONENTS.md)** - Component testing

### Building User Interfaces

1. **[Components Documentation](./COMPONENTS.md)** - Component architecture
2. **[Development Guide](./DEVELOPMENT_GUIDE.md)** - UI development patterns
3. **[Testing Guide](./TESTING.md)** - Frontend testing

## 📝 Documentation Standards

All documentation in this project follows these standards:

- **Clear structure** with proper headings and sections
- **Code examples** with syntax highlighting
- **Diagrams and visuals** where helpful
- **Cross-references** to related documentation
- **Regular updates** to keep information current
- **Practical examples** and real-world usage
- **Troubleshooting sections** for common issues

## 🤝 Contributing to Documentation

When contributing to documentation:

1. **Follow the existing structure and style**
2. **Use clear, concise language**
3. **Include practical examples and code snippets**
4. **Update this index if adding new documentation**
5. **Cross-reference related documentation**
6. **Test all code examples and commands**
7. **Review for accuracy and completeness**

For more information on contributing, see the **[Development Guide](./DEVELOPMENT_GUIDE.md)**.

## 🔍 Finding Specific Information

### Need help with...

- **Project setup?** → [Main README](../README.md)
- **Database issues?** → [Drizzle ORM Implementation](./DRIZZLE_IMPLEMENTATION.md)
- **Architecture questions?** → [Multi-Tenancy Specification](./MULTI_TENANCY_SPECIFICATION.md) + [Relationship Model](./RELATIONSHIP_MODEL.md)
- **Development workflow?** → [Development Guide](./DEVELOPMENT_GUIDE.md)
- **Testing problems?** → [Testing Guide](./TESTING.md)
- **Component usage?** → [Components Documentation](./COMPONENTS.md)
- **Performance optimization?** → [Field Selection Optimization](./FIELD_SELECTION_OPTIMIZATION.md)

### Still can't find what you need?

1. Check the relevant document's troubleshooting section
2. Search through the codebase for examples
3. Review the Git history for recent changes
4. Create an issue or ask the team

---

**📍 Remember:** This documentation index is your starting point. Each document contains detailed information, examples, and troubleshooting guides for its specific area.
