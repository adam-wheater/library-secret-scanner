/**
 * Safely extract an error message from any thrown value.
 * Azure DevOps SDK often throws plain objects instead of Error instances,
 * which would produce "[object Object]" with a naive String() conversion.
 */
export function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e !== null) {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.serverError === "object" && obj.serverError !== null) {
      const se = obj.serverError as Record<string, unknown>;
      if (typeof se.message === "string") return se.message;
    }
    try {
      return JSON.stringify(e);
    } catch {
      /* fall through */
    }
  }
  return String(e);
}
