/** Router/fetch cancellation is expected during rapid mobile navigation. */
export function isNavigationCancellation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { name?: unknown; message?: unknown };
  const name = String(value.name ?? "");
  const message = String(value.message ?? "");
  return (
    name === "AbortError" ||
    name === "CancelledError" ||
    name === "NavigationCancelledError" ||
    message === "CancelledError" ||
    /(?:abort|cancel)(?:led|lation|ed)?/i.test(name) ||
    /(?:abort|cancel)(?:led|lation|ed)?\s+(?:fetch|navigation|request)/i.test(message)
  );
}
