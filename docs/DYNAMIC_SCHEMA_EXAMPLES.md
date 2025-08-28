# Dynamic Schema Examples

This document provides practical examples of how to use the improved dynamic schema validation system.

## Basic Usage

### 1. Automatic Field Detection (Recommended)

```typescript
// ✅ No field specification needed - automatically includes all base fields
return validateOutput(createDynamicSingleSchema(tagSchema), tag, 'createTag method');
```

**What happens:**

- Automatically detects all fields in `tagSchema` (id, name, color, createdAt, updatedAt, deletedAt)
- Creates a validation schema that includes all these fields
- Validates the complete object

### 2. Custom Field Selection

```typescript
// ✅ Specify only the fields you need
return validateOutput(
  createDynamicSingleSchema(tagSchema, ['id', 'name', 'color']),
  tag,
  'getTagSummary method'
);
```

**What happens:**

- Creates a validation schema with only id, name, and color
- Ignores other fields (createdAt, updatedAt, deletedAt)
- Perfect for partial data scenarios

## Real-World Service Examples

### Tag Service

```typescript
export class TagService extends AuditService implements ITagService {
  // Query with field selection
  public async getTags(params: QueryParams & { requestedFields?: string[] }): Promise<TagPage> {
    const result = await this.repository.getTags({
      ...params,
      requestedFields: params.requestedFields, // GraphQL field selection
    });

    // Dynamic validation based on requested fields
    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(tagSchema, params.requestedFields),
      transformedResult,
      'getTags method'
    );

    return validatedResult;
  }

  // Create operation - automatic field detection
  public async createTag(params: CreateTagParams): Promise<Tag> {
    const tag = await this.repository.createTag(params);

    // ✅ No field specification needed - validates all fields
    return validateOutput(createDynamicSingleSchema(tagSchema), tag, 'createTag method');
  }

  // Update operation - automatic field detection
  public async updateTag(params: UpdateTagParams): Promise<Tag> {
    const updatedTag = await this.repository.updateTag(params);

    // ✅ No field specification needed - validates all fields
    return validateOutput(createDynamicSingleSchema(tagSchema), updatedTag, 'updateTag method');
  }

  // Delete operation - automatic field detection
  public async deleteTag(params: DeleteTagParams): Promise<Tag> {
    const deletedTag = await this.repository.deleteTag(params);

    // ✅ No field specification needed - validates all fields
    return validateOutput(createDynamicSingleSchema(tagSchema), deletedTag, 'deleteTag method');
  }
}
```

### User Service

```typescript
export class UserService extends AuditService implements IUserService {
  // Query with field selection
  public async getUsers(params: QueryParams & { requestedFields?: string[] }): Promise<UserPage> {
    const result = await this.repository.getUsers({
      ...params,
      requestedFields: params.requestedFields,
    });

    // Dynamic validation based on requested fields
    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(userSchema, params.requestedFields),
      transformedResult,
      'getUsers method'
    );

    return validatedResult;
  }

  // Create operation - automatic field detection
  public async createUser(params: CreateUserParams): Promise<User> {
    const user = await this.repository.createUser(params);

    // ✅ Automatically validates all user fields
    return validateOutput(createDynamicSingleSchema(userSchema), user, 'createUser method');
  }

  // Custom field validation for specific use case
  public async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.repository.getUser(userId);

    // ✅ Only validate profile-related fields
    return validateOutput(
      createDynamicSingleSchema(userSchema, ['id', 'name', 'email', 'avatar']),
      user,
      'getUserProfile method'
    );
  }
}
```

## Field Selection Scenarios

### 1. GraphQL Query Optimization

```graphql
query GetTagNames {
  tags {
    id
    name
  }
}
```

**Service Implementation:**

```typescript
// requestedFields = ['id', 'name']
const validatedResult = validateOutput(
  createDynamicPaginatedSchema(tagSchema, ['id', 'name']),
  result,
  'getTags method'
);
```

**Result:** Only validates `id` and `name` fields, ignoring `color`, `createdAt`, etc.

### 2. Full Object Validation

```typescript
// No field specification - validates all fields
const validatedTag = validateOutput(createDynamicSingleSchema(tagSchema), tag, 'createTag method');
```

**Result:** Validates all fields in the tag schema (id, name, color, createdAt, updatedAt, deletedAt)

### 3. Custom Field Sets

```typescript
// Custom field set for specific operation
const summaryFields = ['id', 'name', 'color'];
const validatedSummary = validateOutput(
  createDynamicSingleSchema(tagSchema, summaryFields),
  tag,
  'getTagSummary method'
);
```

**Result:** Only validates the specified summary fields

## Migration from Old Approach

### Before (Required Field Constants)

```typescript
// ❌ Had to define field constants
export const TAG_BASE_FIELDS = ['id', 'name', 'color', 'createdAt', 'updatedAt'];
export const TAG_WITH_DELETED_FIELDS = [...TAG_BASE_FIELDS, 'deletedAt'];

// ❌ Had to specify fields for every operation
return validateOutput(
  createDynamicSingleSchema(tagSchema, TAG_BASE_FIELDS),
  tag,
  'createTag method'
);
```

### After (Automatic Field Detection)

```typescript
// ✅ No field constants needed
// ✅ No field specification needed for most operations
return validateOutput(createDynamicSingleSchema(tagSchema), tag, 'createTag method');

// ✅ Still supports custom field selection when needed
return validateOutput(
  createDynamicSingleSchema(tagSchema, ['id', 'name']),
  tag,
  'getTagSummary method'
);
```

## Best Practices

### 1. **Use Automatic Field Detection by Default**

```typescript
// ✅ Recommended for most operations
createDynamicSingleSchema(entitySchema);

// ❌ Only specify fields when you need custom selection
createDynamicSingleSchema(entitySchema, ['id', 'name']);
```

### 2. **Reserve Custom Field Selection for Specific Use Cases**

```typescript
// ✅ Good: Custom field selection for specific needs
createDynamicSingleSchema(userSchema, ['id', 'name', 'avatar']);

// ❌ Avoid: Unnecessary field specification
createDynamicSingleSchema(userSchema, ['id', 'name', 'email', 'createdAt', 'updatedAt']);
```

### 3. **Use Field Selection for GraphQL Queries**

```typescript
// ✅ Good: Pass through GraphQL field selection
createDynamicPaginatedSchema(entitySchema, params.requestedFields);

// ❌ Avoid: Hardcoding fields when GraphQL provides them
createDynamicPaginatedSchema(entitySchema, ['id', 'name']);
```

## Performance Impact

### Field Selection (Optimized)

```typescript
// Only validates requested fields
createDynamicPaginatedSchema(tagSchema, ['id', 'name']);
// Result: Validates 2 fields instead of 6
```

### Automatic Detection (Full Validation)

```typescript
// Validates all fields
createDynamicSingleSchema(tagSchema);
// Result: Validates all 6 fields
```

**Note:** The performance difference is minimal since validation is typically not a bottleneck compared to database queries and network I/O.

## Conclusion

The improved dynamic schema system provides:

- **Simplicity**: No need to specify fields for common operations
- **Flexibility**: Still supports custom field selection when needed
- **Performance**: Maintains field selection optimization
- **Maintainability**: Reduces boilerplate code
- **Consistency**: Uniform validation patterns across services

Use automatic field detection as the default approach, and reserve custom field selection for specific scenarios where you need to validate only a subset of fields.
