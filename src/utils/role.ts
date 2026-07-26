export interface RoleModel {
	code: string;
	name: string;
	description?: string;
}

export const DEFAULT_ROLES: RoleModel[] = [
	{ code: "SA", name: "Superadmin", description: "Complete system control" },
	{ code: "Administrator", name: "Administrator", description: "Manage users and settings" },
	{ code: "Manager", name: "Manager / Scheduler", description: "Manage engineers and schedules" },
	{ code: "Engineer", name: "Field Engineer / Tech", description: "Execute work orders" },
	{ code: "Sales", name: "Sales", description: "Manage customer requests" },
];

export async function fetchRoleList(): Promise<RoleModel[]> {
	try {
		const response = await fetch("api/user-groups");
		if (response.ok) {
			const data = await response.json();
			if (Array.isArray(data) && data.length > 0) return data;
		}
	} catch (e) {
		console.warn("Failed to fetch role list, using default roleList:", e);
	}
	return DEFAULT_ROLES;
}
