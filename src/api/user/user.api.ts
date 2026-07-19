import client, { apiWrap } from "../client";
import type {
    DeleteUserQuery,
    ReassignUserGroupBody,
    UpdatePasswordBody,
    UpdateProfileImageBody,
    GetUsersQuery,
    UpdateUserBody,
    CreateUserBody,
    GetUserByGuidQuery
} from "./user.types";

export interface UserModel {
    guid: string;
    code: string;
    displayCode: string;
    email: string;
    isActive: boolean;
    isVerified: boolean;
    displayName: string;
    profileImage: string | null;
    role: string;
    description: string;
}

export const userApi = {
    getUsers: (query: GetUsersQuery) => 
        apiWrap<{ data: UserModel[]; pagination: any }>(client.GET("/api/user", { params: { query } })),

    createUser: (body: CreateUserBody) => 
        apiWrap<UserModel>(client.POST("/api/user", { body })),

    getUserByGuid: (guid: string, query?: GetUserByGuidQuery) => 
        apiWrap<{ data: UserModel }>(client.GET("/api/user/{guid}", { params: { path: { guid }, query } })),

    updateUser: (guid: string, body: UpdateUserBody) => 
        apiWrap<UserModel>(client.PUT("/api/user/{guid}", { params: { path: { guid } }, body })),

    deleteUser: (guid: string, query: DeleteUserQuery) => 
        apiWrap<void>(client.DELETE("/api/user/{guid}", { params: { path: { guid }, query } })),

    reassignUserGroup: (guid: string, body: ReassignUserGroupBody) => 
        apiWrap<any>(client.PATCH("/api/user/{guid}/group", { params: { path: { guid } }, body })),

    updatePassword: (guid: string, body: UpdatePasswordBody) => 
        apiWrap<any>(client.PATCH("/api/user/{guid}/password", { params: { path: { guid } }, body })),

    updateProfileImage: (body: UpdateProfileImageBody) => 
        apiWrap<any>(client.PUT("/api/user/me/profile-image", { body })),

    removeProfileImage: () => 
        apiWrap<any>(client.DELETE("/api/user/me/profile-image")),

    activateUser: (guid: string) => 
        apiWrap<any>(client.PUT("/api/user/{guid}/activate", { params: { path: { guid } } })),

    deactivateUser: (guid: string) => 
        apiWrap<any>(client.PATCH("/api/user/{guid}/deactivate", { params: { path: { guid } } })),

    reinviteUser: (guid: string) => 
        apiWrap<any>(client.POST("/api/user/{guid}/reinvite", { params: { path: { guid } } })),
}