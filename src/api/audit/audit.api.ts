import client from "../client";
import type { GetAuditsQuery } from "./audit.types";

export const auditApi = {
	getAudits: (query: GetAuditsQuery) => client.GET("/api/audit", { params: { query } }) as any,

	getAuditModules: () => client.GET("/api/audit/modules") as any,

	getAuditByGuid: (guid: string) => client.GET("/api/audit/{guid}", { params: { path: { guid } } }) as any,
};
