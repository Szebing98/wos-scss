/**
 * Extracts a human-readable error message from an unknown API response or generic Error object.
 *
 * @param error The error object (caught in try/catch or returned by openapi-fetch)
 * @param fallback A fallback string if a message cannot be extracted
 * @returns A safe, human-readable string suitable for display
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (!error) return fallback;

	// Handle standard Javascript Error objects
	if (error instanceof Error) {
		return error.message || fallback;
	}

	// Handle custom API error objects or Axios errors
	if (typeof error === "object") {
		const errorRecord = error as Record<string, any>;
		
		// If the error object has a direct string message (e.g., standard object)
		if (typeof errorRecord.message === "string") return errorRecord.message;

		// If the error object is nested inside another error object (e.g., standard API wrapper)
		if (errorRecord.error && typeof errorRecord.error === "object") {
			if (typeof errorRecord.error.message === "string") return errorRecord.error.message;
		}

		// Look for response.data.message (Axios style)
		if (errorRecord.response?.data?.message && typeof errorRecord.response.data.message === "string") {
			return errorRecord.response.data.message;
		}
	}

	// If error is unexpectedly a string, return it
	if (typeof error === "string") {
		return error;
	}

	return fallback;
}
