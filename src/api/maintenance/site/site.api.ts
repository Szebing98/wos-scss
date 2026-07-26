import client from "../../client";
import type { GetSitesQuery, CreateSiteBody, UpdateSiteBody } from "./site.types";

export const siteApi = {
	getSites: (query?: GetSitesQuery) =>
		client.GET("/api/site" as any, { params: { query } }) as any,

	getSiteByGuid: (guid: string) =>
		client.GET("/api/site/{guid}" as any, { params: { path: { guid } } }) as any,

	createSite: (body: CreateSiteBody) =>
		client.POST("/api/site" as any, { body }) as any,

	updateSite: (guid: string, body: UpdateSiteBody) =>
		client.PUT("/api/site/{guid}" as any, { params: { path: { guid } }, body }) as any,

	deleteSite: (guid: string) =>
		client.DELETE("/api/site/{guid}" as any, { params: { path: { guid } } }) as any,
};
