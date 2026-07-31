import client from "../client";
import type { CustomerExportBody, UserExportBody, WorkOrderExportBody } from "./report.types";

export const reportApi = {
	exportWorkOrders: (body: WorkOrderExportBody) =>
		client.POST("/api/report/export/work-orders", { body }),
	exportCustomers: (body: CustomerExportBody) =>
		client.POST("/api/report/export/customers", { body }),
	exportUsers: (body: UserExportBody) => client.POST("/api/report/export/users", { body }),
};
