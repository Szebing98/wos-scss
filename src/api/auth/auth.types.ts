import type { operations } from "../schema";

export type LoginBody =
	operations["postApiAuthLogin"]["requestBody"]["content"]["application/json"];

export type LoginResponse =
	operations["postApiAuthLogin"]["responses"][200]["content"]["application/json"];

export type MeResponse =
	operations["getApiAuthMe"]["responses"][200]["content"]["application/json"];
