import client from "../client";

export interface WorkOrderStatusCount {
	orderStatus: string;
	isDraft: boolean;
	count: number;
}

export const dashboardApi = {
	getWorkOrderCounts: () =>
		client.GET("/api/dashboard/work-order-counts" as any, {} as any) as Promise<{
			data?: WorkOrderStatusCount[];
			error?: unknown;
		}>,
};
