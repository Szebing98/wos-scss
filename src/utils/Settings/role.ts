import http from "../http";

export interface RoleModel {
	code: string;
	name: string;
	description?: string;
}

export const DEFAULT_ROLES: RoleModel[] = [
	{ code: "SA", name: "Superadmin", description: "Complete system control" },
	{ code: "ADM", name: "Administrator", description: "Manage users and settings" },
	{ code: "MNG", name: "Manager", description: "Manage engineers and schedules" },
	{ code: "ENG", name: "Engineer", description: "Execute work orders" },
	{ code: "SAL", name: "Sales", description: "Manage customer requests" },
];

export const ROLE_LEVELS: Record<string, number> = {
	SA: 3,
	SUPERADMIN: 3,
	ADM: 3,
	ADMIN: 3,
	ADMINISTRATOR: 3,
	MGR: 2,
	MNG: 2,
	MANAGER: 2,
	ENG: 1,
	ENGINEER: 1,
	SALES: 1,
	SAL: 1,
};

let cachedRoleList: RoleModel[] | null = null;
let roleListRequest: Promise<RoleModel[]> | null = null;

function normalizeRoleKey(value?: string | null): string {
	return String(value || "")
		.trim()
		.toUpperCase()
		.replace(/\s+/g, "");
}

export function getRoleLevel(role?: Partial<RoleModel> | string | null): number {
	if (!role) return 0;
	const code = typeof role === "string" ? role : role.code;
	const name = typeof role === "string" ? role : role.name;

	return ROLE_LEVELS[normalizeRoleKey(code)] || ROLE_LEVELS[normalizeRoleKey(name)] || 0;
}

export function getHighestRoleLevel(roles: Array<Partial<RoleModel>> = []): number {
	return roles.reduce((highest, role) => Math.max(highest, getRoleLevel(role)), 0);
}

export function hasRole(roles: Array<Partial<RoleModel>> = [], target?: Partial<RoleModel> | null) {
	if (!target) return false;
	const targetCode = normalizeRoleKey(target.code);
	const targetName = normalizeRoleKey(target.name);

	return roles.some((role) => {
		const code = normalizeRoleKey(role.code);
		const name = normalizeRoleKey(role.name);
		return Boolean(
			(targetCode && code === targetCode) ||
			(targetName && name === targetName) ||
			(targetCode && name === targetCode) ||
			(targetName && code === targetName),
		);
	});
}

export async function fetchRoleList(): Promise<RoleModel[]> {
	if (cachedRoleList) return cachedRoleList;
	if (!roleListRequest) {
		roleListRequest = http
			.get("/user-groups")
			.then((res) => {
				const data = res.data?.data || res.data;
				cachedRoleList =
					Array.isArray(data) && data.length > 0
						? data.map((role: any) => ({
								code: role.code || role.id,
								name: role.name || role.code,
								description: role.description || "",
							}))
						: [...DEFAULT_ROLES];
				return cachedRoleList;
			})
			.catch((error) => {
				console.warn("Failed to fetch role list, using default roleList:", error);
				cachedRoleList = [...DEFAULT_ROLES];
				return cachedRoleList;
			})
			.finally(() => {
				roleListRequest = null;
			});
	}
	return roleListRequest;
}
