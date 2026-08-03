import client from "../client";
import type {
	GetWorkOrdersQuery,
	CreateWorkOrderDraftBody,
	CreateWorkOrderNewBody,
	CreateWorkOrderPendingBody,
	RejectWorkOrderBody,
	SubmitWorkOrderNewBody,
	SubmitWorkOrderApprovalBody,
} from "./work-order.types";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3707/api").replace(/\/api\/?$/, "");

function multipartRequest(path: string, body: FormData) {
	const token = localStorage.getItem("authToken");
	const headers = new Headers();
	if (token) headers.set("Authorization", `Bearer ${token}`);

	return fetch(`${API_BASE_URL}${path}`, {
		method: "POST",
		body,
		headers,
		credentials: "include",
	});
}

export const workOrderApi = {
	// Avoid the trailing-slash URL because Vercel may serve a previously cached SPA
	// fallback for `/backend/api/work-order/` instead of applying the API rewrite.
	getWorkOrders: (query: GetWorkOrdersQuery) => client.GET("/api/work-order" as any, { params: { query } }) as any,

	getWorkOrderByGuid: (guid: string) => client.GET("/api/work-order/{guid}", { params: { path: { guid } } }) as any,

	createDraft: (body: CreateWorkOrderDraftBody) => client.POST("/api/work-order/draft", { body }) as any,

	createNew: (body: CreateWorkOrderNewBody) => client.POST("/api/work-order/new", { body }) as any,

	createPending: (body: CreateWorkOrderPendingBody) => client.POST("/api/work-order/pending", { body }) as any,

	approve: (guid: string) => client.PUT("/api/work-order/{guid}/approve", { params: { path: { guid } } }) as any,

	reject: (guid: string, body: RejectWorkOrderBody) =>
		client.PUT("/api/work-order/{guid}/reject", { params: { path: { guid } }, body }) as any,

	claim: (guid: string, body: { invoiceAmount: number }) =>
		client.PUT("/api/work-order/{guid}/claim", { params: { path: { guid } }, body }) as any,

	complete: (guid: string) => client.PUT("/api/work-order/{guid}/complete", { params: { path: { guid } } }) as any,

	close: (guid: string) => client.PUT("/api/work-order/{guid}/close", { params: { path: { guid } } }) as any,

	cancel: (guid: string) => client.PUT("/api/work-order/{guid}/cancel", { params: { path: { guid } } }) as any,

	reopen: (guid: string) => client.PUT("/api/work-order/{guid}/reopen", { params: { path: { guid } } }) as any,

	// Extension, Repeat, Transfer
	extendEndDate: (guid: string, body: { newEstimatedEndDate: string; extensionReason?: string }) =>
		client.POST("/api/work-order/{guid}/extend-end-date" as any, { params: { path: { guid } }, body }) as any,

	repeat: (guid: string, body?: { title?: string; description?: string; startDate?: string; estimatedEndDate?: string }) =>
		client.POST("/api/work-order/{guid}/repeat" as any, { params: { path: { guid } }, body: body || {} }) as any,

	transfer: (guid: string, body?: { title?: string; description?: string; startDate?: string; estimatedEndDate?: string }) =>
		client.POST("/api/work-order/{guid}/transfer" as any, { params: { path: { guid } }, body: body || {} }) as any,

	// Activities & Notes
	getActivities: (guid: string) => client.GET("/api/work-order/{guid}/activities", { params: { path: { guid } } }) as any,

	getNotes: (guid: string) => client.GET("/api/work-order/{guid}/notes", { params: { path: { guid } } }) as any,

	createNote: (guid: string, body: { content: string; viewLevel?: string }) =>
		client.POST("/api/work-order/{guid}/notes" as any, { params: { path: { guid } }, body }) as any,

	updateNote: (noteGuid: string, body: { content?: string; viewLevel?: string }) =>
		client.PUT("/api/work-order/notes/{noteGuid}" as any, { params: { path: { noteGuid } }, body }) as any,

	deleteNote: (noteGuid: string) =>
		client.DELETE("/api/work-order/notes/{noteGuid}" as any, { params: { path: { noteGuid } } }) as any,

	// Parts & Services
	getParts: (guid: string) => client.GET("/api/work-order/{guid}/parts", { params: { path: { guid } } }) as any,

	getServices: (guid: string) => client.GET("/api/work-order/{guid}/services", { params: { path: { guid } } }) as any,

	// Work Order Updates
	updateDraft: (guid: string, body: any) =>
		client.PUT("/api/work-order/{guid}/draft", { params: { path: { guid } }, body }) as any,

	updateNew: (guid: string, body: any) =>
		client.PUT("/api/work-order/{guid}/new", { params: { path: { guid } }, body }) as any,

	updatePending: (guid: string, body: any) =>
		client.PUT("/api/work-order/{guid}/pending", { params: { path: { guid } }, body }) as any,

	updateProgress: (guid: string, body: any) =>
		client.PUT("/api/work-order/{guid}/progress", { params: { path: { guid } }, body }) as any,

	submitNew: (guid: string, body: SubmitWorkOrderNewBody) =>
		client.PUT("/api/work-order/{guid}/submit-new", { params: { path: { guid } }, body }) as any,

	submitApproval: (guid: string, body: SubmitWorkOrderApprovalBody) =>
		client.PUT("/api/work-order/{guid}/submit-approval", { params: { path: { guid } }, body }) as any,

	// Files
	getFiles: (guid: string, query?: { category?: string }) =>
		client.GET("/api/work-order/{guid}/files" as any, { params: { path: { guid }, query } }) as any,

	updateFile: (fileGuid: string, body: any) =>
		client.PUT("/api/work-order/files/{fileGuid}" as any, { params: { path: { fileGuid } }, body }) as any,

	deleteFile: (fileGuid: string) =>
		client.DELETE("/api/work-order/files/{fileGuid}" as any, { params: { path: { fileGuid } } }) as any,

	uploadFile: (guid: string, body: FormData) =>
		multipartRequest(`/api/work-order/${guid}/files/upload`, body) as any,

	uploadFiles: (guid: string, body: FormData) =>
		multipartRequest(`/api/work-order/${guid}/files/upload-bulk`, body) as any,
};
