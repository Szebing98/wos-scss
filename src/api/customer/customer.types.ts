import type { operations } from "../schema";

export type GetCustomersQuery = operations["getApiCustomers"]["parameters"]["query"];

export type CreateCustomerBody = NonNullable<operations["postApiCustomers"]["requestBody"]>["content"]["application/json"];

export type UpdateCustomerBody = NonNullable<operations["putApiCustomersByGuid"]["requestBody"]>["content"]["application/json"];
