import client from "../client";
import type { GetCustomersQuery, CreateCustomerBody, UpdateCustomerBody } from "./customer.types";

export const customerApi = {
	getCustomers: (query: GetCustomersQuery) => client.GET("/api/customers", { params: { query } }) as any,

	createCustomer: (body: CreateCustomerBody) => client.POST("/api/customers", { body }) as any,

	getCustomerByGuid: (guid: string) => client.GET("/api/customers/{guid}", { params: { path: { guid } } }) as any,

	updateCustomer: (guid: string, body: UpdateCustomerBody) =>
		client.PUT("/api/customers/{guid}", { params: { path: { guid } }, body }) as any,

	deleteCustomer: (guid: string) => client.DELETE("/api/customers/{guid}", { params: { path: { guid } } }) as any,

	activateCustomer: (guid: string) =>
		client.PATCH("/api/customers/activate/{guid}", { params: { path: { guid } } }) as any,

	deactivateCustomer: (guid: string) =>
		client.PATCH("/api/customers/deactivate/{guid}", { params: { path: { guid } } }) as any,

	// --- Contract APIs ---
	getContracts: (customerGuid: string) =>
		client.GET("/api/customers/{guid}/contracts" as any, { params: { path: { guid: customerGuid } } }) as any,

	createContract: (customerGuid: string, body: { contractNo: string; contractName: string; startDate: string; endDate: string; description?: string }) =>
		client.POST("/api/customers/{guid}/contracts" as any, { params: { path: { guid: customerGuid } }, body }) as any,

	updateContract: (contractGuid: string, body: { contractNo?: string; contractName?: string; startDate?: string; endDate?: string; description?: string; isActive?: boolean }) =>
		client.PUT("/api/customers/contracts/{contractGuid}" as any, { params: { path: { contractGuid } }, body }) as any,

	renewContract: (contractGuid: string, body: { newEndDate: string; newContractNo?: string; newContractName?: string; remarks?: string }) =>
		client.POST("/api/customers/contracts/{contractGuid}/renew" as any, { params: { path: { contractGuid } }, body }) as any,
};
