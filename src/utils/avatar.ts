/**
 * getAvatarUrl
 *
 * Converts a stored profileImage value into a loadable URL:
 *   - null / empty          → "" (callers should show fallback)
 *   - blob: / http(s): / data: → returned as-is
 *   - R2 object key          → proxied through backend
 *     "users/{guid}/avatar/{uuid}.jpg"
 *     → "http://localhost:3707/api/user/avatar?key=users%2F..."
 *
 * The /api/user/avatar endpoint does NOT require auth,
 * so it works with plain <img :src="..."> tags.
 */
const API_BASE = "http://localhost:3707";

export function getAvatarUrl(path: string | null | undefined): string {
	if (!path) return "";

	if (
		path.startsWith("blob:") ||
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:")
	) {
		return path;
	}

	// R2 key — proxy through backend no-auth endpoint
	return `${API_BASE}/api/user/avatar?key=${encodeURIComponent(path)}`;
}
