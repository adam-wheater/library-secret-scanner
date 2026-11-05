/**
 * Generates a unique ID using crypto.randomUUID() when available,
 * with a collision-resistant fallback for older environments.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
