import http from "./http";

export interface RoleModel {
	code: string;
	name: string;
	description?: string;
}

export const DEFAULT_ROLES: RoleModel[] = [
	{ code: "SA", name: "Superadmin", description: "Complete system control" },
	{ code: "ADM", name: "Administrator", description: "Manage users and settings" },
	{ code: "MGR", name: "Manager", description: "Manage engineers and schedules" },
	{ code: "ENG", name: "Engineer", description: "Execute work orders" },
	{ code: "Sales", name: "Sales", description: "Manage customer requests" },
];

export async function fetchRoleList(): Promise<RoleModel[]> {
	try {
		const res = await http.get("/user-groups");
		const data = res.data?.data || res.data;
		if (Array.isArray(data) && data.length > 0) {
			return data.map((r: any) => ({
				code: r.code || r.id,
				name: r.name || r.code,
				description: r.description || "",
			}));
		}
	} catch (e) {
		console.warn("Failed to fetch role list, using default roleList:", e);
	}
	return DEFAULT_ROLES;
}
