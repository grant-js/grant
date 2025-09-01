# Tag Relationship Implementation Guide

## Overview

This document describes the generic tag relationship implementation that allows any entity repository to automatically support tag filtering and relationship loading without code duplication.

## Architecture

### Core Components

1. **EntityRepository Base Class** - Enhanced with generic tag relationship support
2. **TagRelationshipConfig Interface** - Defines the structure for tag relationships
3. **createTagRelationship Utility** - Helper function to create tag configurations
4. **Automatic Query Routing** - Smart detection of when to load tags

### How It Works

The system automatically detects when tag relationships are requested and routes queries through the appropriate path:

1. **Field Detection**: Checks if `requestedFields` includes `'tags'`
2. **Relationship Check**: Verifies if the entity has a `tagRelationship` configured
3. **Query Routing**:
   - If tags are requested → Uses `queryWithTags()` with JOINs
   - If no tags requested → Uses regular `query()` without JOINs
4. **Automatic Tag Filtering**: Applies `tagIds` filtering when provided

## Implementation Examples

### 1. Project Repository (Already Implemented)

```typescript
import { createTagRelationship } from '@/graphql/repositories/common/utils';
import { projectTags } from '../project-tags/schema';
import { tags } from '../tags/schema';

export class ProjectRepository extends EntityRepository<ProjectModel, Project> {
  protected table = projects;
  protected searchFields: Array<keyof ProjectModel> = ['name', 'slug', 'description'];
  protected defaultSortField: keyof ProjectModel = 'createdAt';

  // Configure tag relationship for this entity
  protected tagRelationship = createTagRelationship(
    projectTags, // Pivot table
    tags, // Tags table
    'projectId', // Field in pivot table referencing project
    'tagId' // Field in pivot table referencing tag
  );

  // ... rest of implementation
}
```

### 2. User Repository (Example)

```typescript
import { createTagRelationship } from '@/graphql/repositories/common/utils';
import { userTags } from '../user-tags/schema';
import { tags } from '../tags/schema';

export class UserRepository extends EntityRepository<UserModel, User> {
  protected table = users;
  protected searchFields: Array<keyof UserModel> = ['name', 'email'];
  protected defaultSortField: keyof UserModel = 'createdAt';

  // Configure tag relationship for this entity
  protected tagRelationship = createTagRelationship(
    userTags, // Pivot table
    tags, // Tags table
    'userId', // Field in pivot table referencing user
    'tagId' // Field in pivot table referencing tag
  );

  // ... rest of implementation
}
```

### 3. Role Repository (Example)

```typescript
import { createTagRelationship } from '@/graphql/repositories/common/utils';
import { roleTags } from '../role-tags/schema';
import { tags } from '../tags/schema';

export class RoleRepository extends EntityRepository<RoleModel, Role> {
  protected table = roles;
  protected searchFields: Array<keyof RoleModel> = ['name', 'description'];
  protected defaultSortField: keyof RoleModel = 'createdAt';

  // Configure tag relationship for this entity
  protected tagRelationship = createTagRelationship(
    roleTags, // Pivot table
    tags, // Tags table
    'roleId', // Field in pivot table referencing role
    'tagId' // Field in pivot table referencing tag
  );

  // ... rest of implementation
}
```

## Usage

### Frontend GraphQL Queries

Once a repository has tag relationship support, you can immediately use tag filtering:

```typescript
// Query projects with specific tags
const { data } = useQuery(GET_PROJECTS, {
  variables: {
    organizationId: 'org-123',
    tagIds: ['tag-1', 'tag-2'], // Filter by specific tags
    page: 1,
    limit: 10,
  },
});

// Query users with tags
const { data } = useQuery(GET_USERS, {
  variables: {
    scope: { tenant: 'ORGANIZATION', id: 'org-123' },
    tagIds: ['tag-3', 'tag-4'], // Filter by specific tags
    page: 1,
    limit: 10,
  },
});
```

### Backend API Calls

The controller automatically handles tag filtering:

```typescript
// Projects controller
const projects = await projectController.getProjects({
  organizationId: 'org-123',
  tagIds: ['tag-1', 'tag-2'],
  page: 1,
  limit: 10,
  requestedFields: ['id', 'name', 'description', 'tags'],
});

// Users controller
const users = await userController.getUsers({
  scope: { tenant: 'ORGANIZATION', id: 'org-123' },
  tagIds: ['tag-3', 'tag-4'],
  page: 1,
  limit: 10,
  requestedFields: ['id', 'name', 'email', 'tags'],
});
```

## Benefits

### 1. **Zero Code Duplication**

- All tag-related logic is centralized in the base class
- Repositories only need to configure their tag relationships
- Consistent behavior across all entities

### 2. **Automatic Performance Optimization**

- Only loads tags when explicitly requested
- Single database query with JOINs instead of N+1 queries
- Efficient tag filtering at the database level

### 3. **Type Safety**

- Full TypeScript support
- Compile-time checking of tag relationship configurations
- Consistent interfaces across all repositories

### 4. **Easy Maintenance**

- Changes to tag logic only need to be made in one place
- Clear separation of concerns
- Easy to extend with new features

## Configuration Requirements

### Database Schema

Each entity that supports tags needs:

1. **Main Entity Table** (e.g., `projects`, `users`, `roles`)
2. **Pivot Table** (e.g., `project_tags`, `user_tags`, `role_tags`)
3. **Tags Table** (`tags` - shared across all entities)

### Pivot Table Structure

```sql
CREATE TABLE entity_tags (
  id UUID PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES entities(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(entity_id, tag_id) WHERE deleted_at IS NULL
);
```

### Repository Configuration

```typescript
protected tagRelationship = createTagRelationship(
  pivotTable,      // The pivot table schema
  tags,            // The tags table schema
  'entityId',      // Field name in pivot table referencing the entity
  'tagId'          // Field name in pivot table referencing the tag
);
```

## Advanced Features

### Custom Tag Fields

The system automatically selects standard tag fields (`id`, `name`, `color`). If you need additional fields, you can extend the base class:

```typescript
// Override in your repository if you need custom tag field selection
protected getTagSelectFields() {
  return {
    tagId: this.tagRelationship.tagTable.id,
    tagName: this.tagRelationship.tagTable.name,
    tagColor: this.tagRelationship.tagTable.color,
    tagDescription: this.tagRelationship.tagTable.description, // Custom field
  };
}
```

### Multiple Tag Relationships

Entities can have multiple tag relationships (e.g., different types of tags):

```typescript
// This would require extending the base class
protected tagRelationships = {
  categories: createTagRelationship(categoryTags, tags, 'entityId', 'categoryId'),
  labels: createTagRelationship(labelTags, tags, 'entityId', 'labelId'),
};
```

## Migration Guide

### From Old Implementation

If you have existing repositories with custom tag logic:

1. **Remove custom tag query methods**
2. **Add tagRelationship configuration**
3. **Update imports to use createTagRelationship utility**
4. **Test that existing functionality still works**

### Example Migration

```typescript
// Before (old way)
export class ProjectRepository extends EntityRepository<ProjectModel, Project> {
  // ... custom tag query methods
  private async queryWithTags() {
    /* custom implementation */
  }
}

// After (new way)
export class ProjectRepository extends EntityRepository<ProjectModel, Project> {
  protected tagRelationship = createTagRelationship(projectTags, 'projectId', 'tagId');
  // All tag logic is now handled automatically!
}
```

## Testing

### Unit Tests

Test that tag relationships work correctly:

```typescript
describe('ProjectRepository', () => {
  it('should load projects with tags when requested', async () => {
    const result = await repository.query({
      requestedFields: ['id', 'name', 'tags'],
      tagIds: ['tag-1', 'tag-2'],
    });

    expect(result.items[0].tags).toBeDefined();
    expect(result.items[0].tags).toHaveLength(2);
  });

  it('should not load tags when not requested', async () => {
    const result = await repository.query({
      requestedFields: ['id', 'name'],
    });

    expect(result.items[0].tags).toBeUndefined();
  });
});
```

### Integration Tests

Test the full GraphQL flow:

```typescript
it('should filter projects by tags', async () => {
  const response = await request(app)
    .post('/graphql')
    .send({
      query: `
        query GetProjects($organizationId: ID!, $tagIds: [ID!]) {
          projects(organizationId: $organizationId, tagIds: $tagIds) {
            projects {
              id
              name
              tags {
                id
                name
                color
              }
            }
          }
        }
      `,
      variables: {
        organizationId: 'org-123',
        tagIds: ['tag-1', 'tag-2'],
      },
    });

  expect(response.body.data.projects.projects).toHaveLength(2);
  expect(response.body.data.projects.projects[0].tags).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **Tags not loading**: Check that `requestedFields` includes `'tags'`
2. **Tag filtering not working**: Verify `tagRelationship` configuration
3. **Performance issues**: Ensure proper database indexes on pivot tables

### Debug Mode

Enable debug logging to see query routing:

```typescript
// Add to your repository for debugging
protected async query(params: BaseQueryArgs<TModel>, transaction?: Transaction) {
  const shouldLoadTags = params.requestedFields?.some(field => field === 'tags' as any);
  console.log('Query params:', { shouldLoadTags, hasTagRelationship: !!this.tagRelationship });

  return super.query(params, transaction);
}
```

## Conclusion

This generic tag relationship implementation provides a clean, maintainable, and performant solution for handling tag relationships across all entities in your system. By following the configuration pattern, any repository can automatically gain tag support without writing additional code.

The system is designed to be:

- **Efficient**: Single database queries with proper JOINs
- **Flexible**: Easy to configure for any entity
- **Maintainable**: Centralized logic with clear separation of concerns
- **Type-safe**: Full TypeScript support with compile-time checking
