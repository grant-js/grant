---
title: Development Guide
description: Project structure, development practices, and collaboration guidelines
---

# Development Guide

This guide covers the development practices, project structure, and collaboration guidelines for Grant.

## Project Structure

```
├── apps/                  # Applications
│   ├── api/              # Apollo Server API
│   │   └── tests/        # API tests
│   └── web/              # Next.js web app
│       └── tests/        # Web app tests (future)
├── packages/             # Shared packages
│   └── @grantjs/   # Scoped packages
├── docs/                 # Documentation
└── public/              # Static assets
```

## GraphQL Structure

Our GraphQL implementation follows a modular structure:

```
graphql/
├── resolvers/           # All resolver implementations
│   ├── auth/           # Authentication resolvers
│   │   ├── mutations/  # Auth mutations (login, logout, etc.)
│   │   └── providers/  # Auth providers (JWT, etc.)
│   └── users/          # User management resolvers
│       ├── mutations/  # User mutations (create, update, delete)
│       ├── queries/    # User queries (get users, etc.)
│       └── providers/  # User data providers (Faker, etc.)
├── schema/             # GraphQL schema definitions
│   ├── auth/          # Auth-related types and operations
│   │   ├── inputs/    # Input types for auth operations
│   │   ├── mutations/ # Auth mutation definitions
│   │   └── types/     # Auth-specific types
│   ├── users/         # User-related types and operations
│   │   ├── inputs/    # Input types for user operations
│   │   ├── mutations/ # User mutation definitions
│   │   ├── queries/   # User query definitions
│   │   └── types/     # User-specific types
│   ├── root.graphql   # Base schema with Query and Mutation types
│   └── index.ts       # Schema compilation and configuration
└── errors.ts          # Shared error types
```

## Components Structure

Our components follow a modular and feature-based structure:

```
components/
├── providers/         # Global context providers
│   ├── apollo/       # Apollo Client provider
│   ├── theme/        # Theme provider (dark/light mode)
│   └── messages/     # Toast messages provider
├── ui/               # Base UI components
│   ├── button/       # Button component
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── form/         # Form components
│   │   ├── input/
│   │   ├── select/
│   │   └── checkbox/
│   └── layout/       # Layout components
│       ├── header/
│       ├── footer/
│       └── sidebar/
└── features/         # Feature-specific components
    ├── auth/         # Authentication components
    │   ├── login-form/
    │   └── register-form/
    └── users/        # User management components
        ├── user-list/
        ├── user-card/
        └── user-form/
```

Each component directory typically contains:

- `index.tsx` - Main component implementation
- `types.ts` - TypeScript types and interfaces
- `styles.ts` - Component-specific styles (if needed)
- `utils.ts` - Component-specific utilities
- `hooks.ts` - Custom hooks used by the component
- `constants.ts` - Component-specific constants

Example component structure:

```
components/features/users/user-card/
├── index.tsx         # Main component
├── types.ts          # TypeScript types
├── styles.ts         # Component styles
├── utils.ts          # Helper functions
├── hooks.ts          # Custom hooks
└── constants.ts      # Constants
```

## Scaffolding New Features

### GraphQL Features

When adding a new GraphQL feature, follow these steps:

1. **Define Schema Types**:
   - Create a new directory in `graphql/schema/{feature}/`
   - Define types in `types/` directory
   - Define inputs in `inputs/` directory
   - Define queries/mutations in respective directories

2. **Implement Resolvers**:
   - Create a new directory in `graphql/resolvers/{feature}/`
   - Implement resolvers in appropriate subdirectories
   - Create a provider if needed for data access

3. **Register Resolvers**:
   - Add query resolvers to `graphql/resolvers/queries.ts`
   - Add mutation resolvers to `graphql/resolvers/mutations.ts`

4. **Update Schema**:
   - Extend Query/Mutation types in your feature's schema files
   - No need to modify `root.graphql`

Example for a new "posts" feature:

```graphql
# graphql/schema/posts/types/post.graphql
type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: Date!
}

# graphql/schema/posts/queries/get-posts.graphql
extend type Query {
  posts: [Post!]!
}

# graphql/schema/posts/mutations/create-post.graphql
extend type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

```typescript
// graphql/resolvers/posts/queries/getPosts.ts
export async function getPosts() {
  // Implementation
}

// graphql/resolvers/queries.ts
import * as postQueries from './posts/queries';

export const Query = {
  posts: postQueries.getPosts,
} as const;
```

### UI Components

1. **Install Dependencies**:

   ```bash
   # Install Radix UI primitives
   npm install @radix-ui/react-[component-name]

   # Add shadcn/ui components
   npx shadcn-ui@latest add [component-name]
   ```

2. **Create Component**:
   - Add to `components/ui/` for base components
   - Add to `components/features/{feature}/` for feature-specific components
   - Use the `cn` utility for class name merging

3. **Add Internationalization**:
   - Add translations in `i18n/locales/`
   - Use the `useTranslations` hook
   - Update `i18n/routing.ts` if needed

4. **Add to Pages**:
   - Import and use in page components
   - Add proper loading states
   - Handle errors appropriately

### Forms

1. **Create Schema**:

   ```typescript
   // lib/schemas/{feature}.ts
   import { z } from 'zod';

   export const featureSchema = z.object({
     // Define schema
   });
   ```

2. **Create Form Component**:

   ```typescript
   // components/features/{feature}/form.tsx
   import { useForm } from 'react-hook-form';
   import { zodResolver } from '@hookform/resolvers/zod';
   import { featureSchema } from '@/lib/schemas/{feature}';

   export function FeatureForm() {
     const form = useForm({
       resolver: zodResolver(featureSchema),
     });
     // Implement form
   }
   ```

## Best Practices

### GraphQL

1. **Schema Organization**:
   - Keep schema files focused and modular
   - Use descriptive names for types and operations
   - Document complex types with descriptions

2. **Resolver Implementation**:
   - Implement resolvers in separate files
   - Use providers for data access abstraction
   - Handle errors consistently using shared error types

3. **Type Safety**:
   - Use TypeScript for all resolver implementations
   - Leverage generated types from GraphQL Code Generator
   - Maintain strict type checking

4. **Testing**:
   - Write unit tests for resolvers
   - Test error cases and edge conditions
   - Mock providers for testing

### UI/UX

1. **Component Design**:
   - Keep components small and focused
   - Use TypeScript for all new code
   - Follow the established folder structure
   - Use path aliases for imports

2. **Styling**:
   - Use Tailwind CSS classes
   - Follow the design system
   - Maintain dark mode compatibility
   - Use CSS variables for theming

3. **Performance**:
   - Use React.memo for expensive components
   - Implement proper loading states
   - Optimize images and assets
   - Use proper caching strategies

4. **Security**:
   - Validate all user inputs
   - Sanitize API responses
   - Use environment variables for secrets
   - Implement proper CORS policies

## Common Tasks

### GraphQL

1. **Adding a New Query**:

   ```bash
   # 1. Create schema file
   touch graphql/schema/{feature}/queries/get-{feature}.graphql

   # 2. Create resolver
   touch graphql/resolvers/{feature}/queries/get{Feature}.ts

   # 3. Register in queries.ts
   ```

2. **Adding a New Mutation**:

   ```bash
   # 1. Create schema files
   touch graphql/schema/{feature}/inputs/create-{feature}.graphql
   touch graphql/schema/{feature}/mutations/create-{feature}.graphql

   # 2. Create resolver
   touch graphql/resolvers/{feature}/mutations/create{Feature}.ts

   # 3. Register in mutations.ts
   ```

3. **Adding a New Provider**:

   ```bash
   # 1. Create provider directory
   mkdir -p graphql/resolvers/{feature}/providers/{provider}

   # 2. Create provider files
   touch graphql/resolvers/{feature}/providers/{provider}/index.ts
   touch graphql/resolvers/{feature}/providers/{provider}/types.ts
   ```

### UI/UX

1. **Adding a New Page**:

   ```bash
   # 1. Create page directory
   mkdir -p app/[locale]/{feature}

   # 2. Create page files
   touch app/[locale]/{feature}/page.tsx
   touch app/[locale]/{feature}/loading.tsx
   touch app/[locale]/{feature}/error.tsx
   ```

2. **Adding a New Component**:

   ```bash
   # 1. Create component directory
   mkdir -p components/features/{feature}

   # 2. Create component files
   touch components/features/{feature}/index.tsx
   touch components/features/{feature}/types.ts
   ```

3. **Adding Translations**:

   ```bash
   # 1. Add to English locale
   echo '"feature": { "key": "value" }' >> i18n/locales/en.json

   # 2. Add to German locale
   echo '"feature": { "key": "value" }' >> i18n/locales/de.json
   ```

## Development Workflow

Remember to:

- Run `npm run generate` after making GraphQL schema changes
- Run `npm run lint` to check for code issues
- Run `npm run test` to ensure tests pass
- Update documentation as needed

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

---

**Next:** Learn about [Project Structure](/development/structure) for detailed architecture information.
