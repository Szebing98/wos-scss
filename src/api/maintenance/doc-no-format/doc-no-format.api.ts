import client from "../../client";
import type {
	GetDocNoFormatsQuery,
	CreateDocNoFormatBody,
	UpdateDocNoFormatBody,
} from "./doc-no-format.types";

export const docNoFormatApi = {
	getDocNoFormats: (query?: GetDocNoFormatsQuery) =>
		client.GET("/api/doc-no-format" as any, { params: { query } }) as any,

	getDocNoFormatById: (id: number) =>
		client.GET("/api/doc-no-format/{id}" as any, { params: { path: { id } } }) as any,

	createDocNoFormat: (body: CreateDocNoFormatBody) =>
		client.POST("/api/doc-no-format" as any, { body }) as any,

	updateDocNoFormat: (id: number, body: UpdateDocNoFormatBody) =>
		client.PUT("/api/doc-no-format/{id}" as any, { params: { path: { id } }, body }) as any,

	deleteDocNoFormat: (id: number) =>
		client.DELETE("/api/doc-no-format/{id}" as any, { params: { path: { id } } }) as any,
};
