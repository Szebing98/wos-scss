import type { operations } from "../../schema";

export type CreateWorkTypeItemBody = NonNullable<
	operations["postApiWork-type-item"]["requestBody"]
>["content"]["application/json"];

export type UpdateWorkTypeItemBody = NonNullable<
	operations["putApiWork-type-itemByGuid"]["requestBody"]
>["content"]["application/json"];
