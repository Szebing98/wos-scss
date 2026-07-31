import type { operations } from "../schema";

export type WorkOrderExportBody = NonNullable<
	operations["postApiReportExportWork-orders"]["requestBody"]
>["content"]["application/json"];

export type CustomerExportBody = NonNullable<
	operations["postApiReportExportCustomers"]["requestBody"]
>["content"]["application/json"];

export type UserExportBody = NonNullable<
	operations["postApiReportExportUsers"]["requestBody"]
>["content"]["application/json"];

export type ExportResponse = {
	message: string;
	count: number;
	type: string;
	data: Record<string, unknown>[];
};
