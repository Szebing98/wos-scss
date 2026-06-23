import type { operations } from "../../schema";

export type GetWorkTypesQuery = operations["getApiWork-type"]["parameters"]["query"];

export type CreateWorkTypeBody = NonNullable<
	operations["postApiWork-type"]["requestBody"]
>["content"]["application/json"];

export type UpdateWorkTypeBody = NonNullable<
	operations["putApiWork-typeByGuid"]["requestBody"]
>["content"]["application/json"];

export type GetWorkTypeItemsQuery = operations["getApiWork-typeByGuidItems"]["parameters"]["query"];
