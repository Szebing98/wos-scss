import type { operations } from "../schema";

export type GetUsersQuery = operations["getApiUser"]["parameters"]["query"] & {
	isVerified?: "true" | "false";
};

export type GetUserByGuidQuery = operations["getApiUserByGuid"]["parameters"]["query"];

export type CreateUserBody = NonNullable<operations["postApiUser"]["requestBody"]>["content"]["application/json"];

export type UpdateUserBody = NonNullable<operations["putApiUserByGuid"]["requestBody"]>["content"]["application/json"];

export type DeleteUserQuery = operations["deleteApiUserByGuid"]["parameters"]["query"];

export type ReassignUserGroupBody = NonNullable<operations["patchApiUserByGuidGroup"]["requestBody"]>["content"]["application/json"];

export type UpdatePasswordBody = NonNullable<operations["patchApiUserByGuidPassword"]["requestBody"]>["content"]["application/json"];

export type UpdateProfileImageBody = NonNullable<operations["putApiUserMeProfile-image"]["requestBody"]>["content"]["multipart/form-data"];
