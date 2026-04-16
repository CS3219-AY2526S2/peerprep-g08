/**
 * Safely extract error message from unknown error types
 * Handles Error objects, strings, and other unknown types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  // Check for API error response structure
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return (error as Record<string, unknown>).message as string;
  }

  // Fallback
  return "An unexpected error occurred.";
}
