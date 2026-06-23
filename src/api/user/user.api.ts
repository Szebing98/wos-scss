import client from "../client";
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

export const userApi = {
    getUsers: (query: GetUsersQuery) => client.GET("/api/user", { params: { query } }),

    createUser: (body: CreateUserBody) => client.POST("/api/user", { body }),

    getUserByGuid: (guid: string, query: GetUserByGuidQuery) => client.GET("/api/user/{guid}", { params: { path: { guid }, query } }),

    updateUser: (guid: string, body: UpdateUserBody) => client.PUT("/api/user/{guid}", { params: { path: { guid } }, body }),

    deleteUser: (guid: string, query: DeleteUserQuery) => client.DELETE("/api/user/{guid}", { params: { path: { guid }, query } }),

    reassignUserGroup: (guid: string, body: ReassignUserGroupBody) => client.PATCH("/api/user/{guid}/group", { params: { path: { guid } }, body }),

    updatePassword: (guid: string, body: UpdatePasswordBody) => client.PATCH("/api/user/{guid}/password", { params: { path: { guid } }, body }),

    updateProfileImage: (body: UpdateProfileImageBody) => client.PUT("/api/user/me/profile-image", { body }),

    removeProfileImage: () => client.DELETE("/api/user/me/profile-image"),

    activateUser: (guid: string) => client.PUT("/api/user/{guid}/activate", { params: { path: { guid } } }),

    deactivateUser: (guid: string) => client.PATCH("/api/user/{guid}/deactivate", { params: { path: { guid } } }),

    reinviteUser: (guid: string) => client.POST("/api/user/{guid}/reinvite", { params: { path: { guid } } }),
}