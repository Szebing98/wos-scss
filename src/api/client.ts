import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

const authMiddleware: Middleware = {
	async onRequest({ request }) {
		const token = localStorage.getItem("authToken");
		if (token) {
			request.headers.set("Authorization", `Bearer ${token}`);
		}
		return request;
	},
	async onResponse({ request, response }) {
		if (response.status === 401) {
			localStorage.removeItem("authToken");
			if (!request.url.includes("/api/auth/login")) {
				window.location.href = "/account/login";
			}
		}
		return response;
	},
};

const client = createClient<paths>({
	baseUrl: (import.meta.env.VITE_API_URL || "http://localhost:3707/api").replace(/\/api$/, ""),
	credentials: "include",
});

client.use(authMiddleware);

export default client;

export interface FetchResponse<T> {
	data?: T;
	error?: {
		message: string;
		[key: string]: any;
	} | null;
	response: Response;
}

export function apiWrap<T>(promise: Promise<any>): Promise<FetchResponse<T>> {
	return promise;
}
