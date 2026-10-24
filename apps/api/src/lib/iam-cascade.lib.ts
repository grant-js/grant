/**
 * Bounds IAM cascade fan-out. Callers still invoke one revoke per subject;
 * this only limits how many run concurrently.
 */
export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunkSize = Math.max(1, size);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

export async function runInChunks<T>(
  items: readonly T[],
  size: number,
  worker: (item: T) => Promise<unknown>
): Promise<void> {
  for (const chunk of chunkArray(items, size)) {
    await Promise.all(chunk.map(worker));
  }
}
