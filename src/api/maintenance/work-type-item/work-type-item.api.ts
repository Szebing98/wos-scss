import client from "../../client";
import type { CreateWorkTypeItemBody, UpdateWorkTypeItemBody } from "./work-type-item.types";

export const workTypeItemApi = {
	createWorkTypeItem: (body: CreateWorkTypeItemBody) =>
		client.POST("/api/work-type-item", { body }),

	getWorkTypeItem: (guid: string) =>
		client.GET("/api/work-type-item/{guid}", { params: { path: { guid } } }),

	updateWorkTypeItem: (guid: string, body: UpdateWorkTypeItemBody) =>
		client.PUT("/api/work-type-item/{guid}", {
			params: { path: { guid } },
			body,
		}),

	deleteWorkTypeItem: (guid: string) =>
		client.DELETE("/api/work-type-item/{guid}", { params: { path: { guid } } }),

	activateWorkTypeItem: (guid: string) =>
		client.PATCH("/api/work-type-item/activate/{guid}", {
			params: { path: { guid } },
		}),

	deactivateWorkTypeItem: (guid: string) =>
		client.PATCH("/api/work-type-item/deactivate/{guid}", {
			params: { path: { guid } },
		}),
};
