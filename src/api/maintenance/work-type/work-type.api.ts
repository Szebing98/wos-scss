import client from "../../client";
import type {
    GetWorkTypesQuery,
    CreateWorkTypeBody,
    UpdateWorkTypeBody,
    GetWorkTypeItemsQuery,
} from "./work-type.types";

export const workTypeApi = {
    getWorkTypes: (query: GetWorkTypesQuery) =>
        client.GET("/api/work-type", { params: { query } }),

    createWorkType: (body: CreateWorkTypeBody) =>
        client.POST("/api/work-type", { body }),

    getWorkType: (guid: string) =>
        client.GET("/api/work-type/{guid}", { params: { path: { guid } } }),

    updateWorkType: (guid: string, body: UpdateWorkTypeBody) =>
        client.PUT("/api/work-type/{guid}", {
            params: { path: { guid } },
            body,
        }),

    deleteWorkType: (guid: string) =>
        client.DELETE("/api/work-type/{guid}", { params: { path: { guid } } }),

    getWorkTypeItems: (guid: string, query: GetWorkTypeItemsQuery) =>
        client.GET("/api/work-type/{guid}/items", {
            params: { path: { guid }, query },
        }),

    activateWorkType: (guid: string) =>
        client.PATCH("/api/work-type/activate/{guid}", {
            params: { path: { guid } },
        }),

    deactivateWorkType: (guid: string) =>
        client.PATCH("/api/work-type/deactivate/{guid}", {
            params: { path: { guid } },
        }),
};
