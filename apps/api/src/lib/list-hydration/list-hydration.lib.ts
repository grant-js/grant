type PropertyKeyOf<TItem> = Extract<keyof TItem, string>;

export type ListHydrator<TItem, TContext> = {
  fields: Array<PropertyKeyOf<TItem>>;
  hydrate: (params: {
    context: TContext;
    items: TItem[];
    requestedFields: Array<PropertyKeyOf<TItem>>;
  }) => Promise<TItem[]> | TItem[];
};

export function stripHydratedFields<TItem>(
  requestedFields: Array<PropertyKeyOf<TItem>> | null | undefined,
  hydrators: Array<{ fields: Array<PropertyKeyOf<TItem>> }>
): Array<PropertyKeyOf<TItem>> | undefined {
  if (!requestedFields) {
    return undefined;
  }

  const hydratedFields = new Set(hydrators.flatMap((hydrator) => hydrator.fields));
  return requestedFields.filter((field) => !hydratedFields.has(field));
}

export async function hydrateList<
  TItem,
  TContext,
  TItemsKey extends string,
  TPage extends Record<TItemsKey, TItem[]>,
>(params: {
  context: TContext;
  hydrators: Array<ListHydrator<TItem, TContext>>;
  itemsKey: TItemsKey;
  page: TPage;
  requestedFields: Array<PropertyKeyOf<TItem>> | null | undefined;
}): Promise<TPage> {
  const { context, hydrators, itemsKey, page, requestedFields } = params;
  const items = page[itemsKey];

  if (!Array.isArray(items) || items.length === 0 || !requestedFields) {
    return page;
  }

  const requestedFieldSet = new Set(requestedFields);
  let hydratedItems: TItem[] = items;

  for (const hydrator of hydrators) {
    const shouldHydrate = hydrator.fields.some((field) => requestedFieldSet.has(field));
    if (!shouldHydrate) {
      continue;
    }

    hydratedItems = await hydrator.hydrate({
      context,
      items: hydratedItems,
      requestedFields,
    });
  }

  return {
    ...page,
    [itemsKey]: hydratedItems,
  } as TPage;
}
