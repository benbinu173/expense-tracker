/**
 * Next 16 gives page `searchParams` values as `string | string[] | undefined`,
 * because `?period=week&period=year` is legal. Every one of our params is
 * single-valued, so take the first and let the validator reject the rest.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
