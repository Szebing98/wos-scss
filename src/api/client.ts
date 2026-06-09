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
	async onResponse({ response }) {
		if (response.status === 401) {
			localStorage.removeItem("authToken");
		}
		return response;
	},
};

const client = createClient<paths>({
	baseUrl: "http://localhost:3707",
	credentials: "include",
});

client.use(authMiddleware);

export default client;
