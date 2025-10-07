import { GraphQLResolveInfo, FieldNode } from 'graphql';

export function getDirectFieldSelection<T>(
  info: GraphQLResolveInfo,
  path: string[] = []
): Array<T> {
  const selections = info.fieldNodes[0]?.selectionSet?.selections || [];

  function traverseSelections(selections: readonly any[], currentPath: string[]): Array<T> {
    const result: Set<T> = new Set();

    for (const selection of selections) {
      if (selection.kind === 'Field') {
        const fieldNode = selection as FieldNode;
        const fieldName = fieldNode.name.value as T;

        if (currentPath.length === 0) {
          result.add(fieldName as T);
        } else if (fieldName === currentPath[0] && fieldNode.selectionSet) {
          const nestedFields = traverseSelections(
            fieldNode.selectionSet.selections,
            currentPath.slice(1)
          );
          nestedFields.forEach((field) => {
            result.add(field);
          });
        }
      }
    }

    return Array.from(result.values());
  }

  return traverseSelections(selections, path);
}
