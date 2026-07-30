import type { operations } from "../schema";

export type GetWorkOrdersQuery = operations["getApiWork-order"]["parameters"]["query"];

export type CreateWorkOrderDraftBody = NonNullable<operations["postApiWork-orderDraft"]["requestBody"]>["content"]["application/json"];

export type CreateWorkOrderNewBody = NonNullable<operations["postApiWork-orderNew"]["requestBody"]>["content"]["application/json"];

export type CreateWorkOrderPendingBody = NonNullable<operations["postApiWork-orderPending"]["requestBody"]>["content"]["application/json"];

export type SubmitWorkOrderNewBody = NonNullable<operations["putApiWork-orderByGuidSubmit-new"]["requestBody"]>["content"]["application/json"];

export type SubmitWorkOrderApprovalBody = NonNullable<operations["putApiWork-orderByGuidSubmit-approval"]["requestBody"]>["content"]["application/json"];

export type RejectWorkOrderBody = NonNullable<operations["putApiWork-orderByGuidReject"]["requestBody"]>["content"]["application/json"];
