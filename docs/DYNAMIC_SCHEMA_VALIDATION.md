# Dynamic Schema Validation for Field Selection Optimization

## Overview

This document explains how we've solved the conflict between GraphQL field selection optimization and output validation schemas. The solution maintains both performance benefits and data integrity through dynamic schema generation.

## The Problem

Our GraphQL server implements field selection optimization to improve database performance:

1. **Field Selection**: Extracts requested fields from GraphQL queries
2. **Query Optimization**: Only selects requested database columns
3. **Output Filtering**: Returns only requested fields
4. **Schema Validation**: Validates output using Zod schemas

**Conflict**: Output validation schemas expect complete objects, but field selection returns partial objects.

## The Solution: Dynamic Schema Generation

We've implemented a dynamic schema system that creates validation schemas based on the requested fields:

### Core Functions

```typescript
// Create dynamic entity schema based on requested fields
createDynamicEntitySchema(baseSchema, requestedFields);

// Create dynamic paginated response schema
createDynamicPaginatedSchema(itemSchema, requestedFields);

// Create dynamic single entity schema
createDynamicSingleSchema(baseSchema, requestedFields);
```

### How It Works

1. **Field-Aware Validation**: Schemas only validate fields that are present
2. **Performance Maintained**: Field selection optimization continues to work
3. **Data Integrity**: Output validation ensures data quality
4. **Type Safety**: Full TypeScript support maintained

## Implementation Example

### Before (Conflicting Approach)

```typescript
// ❌ This fails because tagSchema expects all fields
const validatedResult = validateOutput(
  paginatedResponseSchema(tagSchema), // Expects complete objects
  transformedResult, // Contains partial objects
  'getTags method'
);
```

### After (Dynamic Schema Approach)

```typescript
// ✅ This works because schema adapts to requested fields
const validatedResult = validateOutput(
  createDynamicPaginatedSchema(tagSchema, params.requestedFields),
  transformedResult,
  'getTags method'
);
```

### Automatic Base Field Inclusion

```typescript
// No need to specify fields - automatically includes all base fields
return validateOutput(
  createDynamicSingleSchema(tagSchema), // Automatically includes all fields
  tag,
  'createTag method'
);

// Or specify only specific fields if needed
return validateOutput(
  createDynamicSingleSchema(tagSchema, ['id', 'name', 'color']),
  tag,
  'getTag method'
);
```

## Benefits

### 1. **Performance Optimization Maintained**

- Database queries still only select requested fields
- Network bandwidth reduced
- Memory usage optimized

### 2. **Data Integrity Preserved**

- Output validation continues to work
- Runtime type safety maintained
- Schema compliance ensured

### 3. **Developer Experience Improved**

- No need to make all fields optional
- Clear field requirements for each operation
- Consistent validation patterns
- **Automatic field detection** - no need to specify base fields

### 4. **Maintainability Enhanced**

- Centralized field set definitions
- Easy to update field requirements
- Clear separation of concerns
- **Reduced boilerplate** - automatic inclusion of all base fields

## Usage Patterns

### Query Operations (Field Selection)

```typescript
public async getTags(params: QueryParams & { requestedFields?: string[] }): Promise<TagPage> {
  const result = await this.repository.getTags({
    ...params,
    requestedFields: params.requestedFields, // Pass through field selection
  });

  // Validate with dynamic schema
  const validatedResult = validateOutput(
    createDynamicPaginatedSchema(tagSchema, params.requestedFields),
    transformedResult,
    'getTags method'
  );

  return validatedResult;
}
```

### Automatic Field Detection

The `createDynamicSingleSchema` function automatically includes all base fields when no specific fields are specified:

```typescript
// Automatically includes all fields from the base schema
createDynamicSingleSchema(tagSchema);

// Explicitly specify only certain fields
createDynamicSingleSchema(tagSchema, ['id', 'name', 'color']);
```

This eliminates the need to define field constants for common operations while maintaining flexibility for custom field selection.

### Mutation Operations (Automatic Fields)

```typescript
public async createTag(params: CreateTagParams): Promise<Tag> {
  const tag = await this.repository.createTag(params);

  // Automatically validates all base fields
  return validateOutput(
    createDynamicSingleSchema(tagSchema), // No field specification needed
    tag,
    'createTag method'
  );
}
```

## Migration Guide

### 1. Update Service Imports

```typescript
import { createDynamicPaginatedSchema, createDynamicSingleSchema } from '../common';
```

### 2. Replace Static Schemas

```typescript
// Before
validateOutput(paginatedResponseSchema(tagSchema), data, context);

// After
validateOutput(createDynamicPaginatedSchema(tagSchema, requestedFields), data, context);
```

### 3. Use Automatic Field Detection (Optional)

```typescript
// For most operations, no field specification needed
createDynamicSingleSchema(entitySchema); // Automatically includes all fields

// Only specify fields when you need custom field selection
createDynamicSingleSchema(entitySchema, ['id', 'name', 'color']);
```

### 4. Update Validation Calls

```typescript
// Single entity operations (automatic field detection)
return validateOutput(
  createDynamicSingleSchema(entitySchema), // No field specification needed
  entity,
  context
);

// Custom field selection (when needed)
return validateOutput(createDynamicSingleSchema(entitySchema, ['id', 'name']), entity, context);

// Paginated operations
return validateOutput(createDynamicPaginatedSchema(entitySchema, requestedFields), result, context);
```

## Best Practices

### 1. **Use Field Constants**

- Define common field sets in constants files
- Avoid hardcoding field arrays in services
- Make field requirements explicit and maintainable

### 2. **Consistent Naming**

- Use descriptive names for field sets
- Follow the pattern: `ENTITY_OPERATION_FIELDS`
- Document field set purposes

### 3. **Field Set Organization**

- Group related fields logically
- Include required fields (like `id`) in all sets
- Consider operation-specific requirements

### 4. **Validation Context**

- Always provide meaningful context in validation calls
- Use consistent error message patterns
- Include field information in error context

## Error Handling

The dynamic schema system maintains the same error handling as static schemas:

```typescript
try {
  const validatedResult = validateOutput(
    createDynamicPaginatedSchema(tagSchema, requestedFields),
    data,
    'getTags method'
  );
  return validatedResult;
} catch (error) {
  // ValidationError with detailed field information
  console.error('Validation failed:', error.message);
  throw error;
}
```

## Future Enhancements

### 1. **Automatic Field Detection**

- Infer required fields from GraphQL schema
- Generate field sets automatically
- Reduce manual field set maintenance

### 2. **Field Set Composition**

- Allow field sets to be combined
- Support field set inheritance
- Enable dynamic field set generation

### 3. **Performance Monitoring**

- Track field selection patterns
- Monitor validation performance
- Optimize field set definitions

## Conclusion

The dynamic schema validation system successfully resolves the conflict between field selection optimization and output validation. It provides:

- **Performance**: Maintains database query optimization
- **Integrity**: Preserves data validation
- **Maintainability**: Improves code organization
- **Flexibility**: Supports dynamic field requirements

This solution allows us to have the best of both worlds: efficient database queries and robust data validation.
