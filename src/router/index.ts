import MainLayout from "@/layouts/MainLayout.vue";
import { useAuthStore } from "@/stores/auth.store";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		path: "/account",
		children: [
			{
				path: "login",
				name: "Login",
				component: () => import("@/views/Account/Login.vue"),
			},
			{
				path: "forgot-password",
				name: "Forgot Password",
				component: () => import("@/views/Account/ForgotPassword.vue"),
			},
			{
				path: "reset-password",
				name: "reset-password",
				component: () => import("@/views/Account/ResetPassword.vue"),
				meta: { requiresAuth: false },
			},
			{
				path: "activate",
				name: "activate",
				component: () => import("@/views/Account/ActivateAccount.vue"),
				meta: { requiresAuth: false },
			},
		],
	},
	{
		path: "/",
		component: MainLayout,
		redirect: "/dashboard",
		children: [
			{
				path: "dashboard",
				name: "Dashboard",
				component: () => import("@/views/Dashboard/index.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "audit-log",
				name: "Audit Log",
				component: () => import("@/views/AuditLog/index.vue"),
				meta: { requiresAuth: true, permission: ["read", "Audit"] },
			},
			{
				path: "settings",
				name: "Settings",
				component: () => import("@/views/Settings/index.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "notifications",
				name: "Notifications",
				component: () => import("@/views/Notifications/index.vue"),
				meta: { requiresAuth: true, breadcrumb: "Notifications" },
			},
			{
				path: "about",
				name: "About",
				component: () => import("@/views/About/index.vue"),
				meta: { requiresAuth: true },
			},
		],
	},
	{
		path: "/customer",
		component: MainLayout,
		meta: { breadcrumb: false },
		children: [
			{
				path: "list",
				name: "Customer List",
				component: () => import("@/views/Customer/CustomerList.vue"),
				meta: {
					requiresAuth: true,
					breadcrumb: "Customer List",
					permission: ["read", "Customer"],
				},
			},
			{
				path: "profile",
				name: "Customer Profile",
				component: () => import("@/views/Customer/CustomerProfile.vue"),
				meta: {
					requiresAuth: true,
					breadcrumb: "Customer Profile",
					permission: ["read", "Customer"],
				},
			},
			{
				path: "form",
				name: "Customer Form",
				component: () => import("@/views/Customer/CustomerForm.vue"),
				meta: {
					requiresAuth: true,
					breadcrumb: "Customer Form",
					permission: ["read", "Customer"],
				},
			},
		],
	},
	{
		path: "/maintenance",
		component: MainLayout,
		children: [
			{
				path: "work-types",
				name: "Work Types",
				component: () => import("@/views/Maintenance/WorkType.vue"),
				meta: { requiresAuth: true, permission: ["read", "WorkType"] },
			},
			{
				path: "location",
				name: "Location",
				component: () => import("@/views/Maintenance/Location.vue"),
				meta: { requiresAuth: true, permission: ["read", "Location"] },
			},
			{
				path: "site",
				name: "Site",
				component: () => import("@/views/Maintenance/Site.vue"),
				meta: { requiresAuth: true, permission: ["read", "Site"] },
			},
			// {
			// 	path: "parts",
			// 	name: "Part Info",
			// 	component: () => import("@/views/Maintenance/PartInfo.vue"),
			// 	meta: { requiresAuth: true },
			// },
			// {
			// 	path: "services",
			// 	name: "Service Provided",
			// 	component: () => import("@/views/Maintenance/ServiceProvided.vue"),
			// 	meta: { requiresAuth: true },
			// },
			{
				path: "doc-no-format",
				name: "Document No. Format",
				component: () => import("@/views/Maintenance/DocNoFormat.vue"),
				meta: { requiresAuth: true, permission: ["read", "DocNoFormat"] },
			},
			{
				path: "role-permission",
				name: "Role Permission",
				component: () => import("@/views/Maintenance/RolePermission.vue"),
				meta: { requiresAuth: true, permission: ["read", "Permission"] },
			},
			{
				path: "user-permission",
				name: "User Permission",
				component: () => import("@/views/Maintenance/UserPermission.vue"),
				meta: { requiresAuth: true, permission: ["read", "Permission"] },
			},
		],
	},
	{
		path: "/user",
		component: MainLayout,
		meta: { breadcrumb: false },
		children: [
			{
				path: "list",
				name: "User List",
				component: () => import("@/views/User/UserList.vue"),
				meta: {
					requiresAuth: true,
					breadcrumb: "Employee List",
					permission: ["read", "User"],
				},
			},
			{
				path: "profile",
				name: "User Profile",
				component: () => import("@/views/User/UserProfile.vue"),
				meta: {
					requiresAuth: true,
					breadcrumb: "User Profile",
					permission: ["read", "User"],
				},
			},
			{
				path: "form",
				name: "User Form",
				component: () => import("@/views/User/UserProfile.vue"),
				meta: { requiresAuth: true, breadcrumb: "User Form", permission: ["read", "User"] },
			},
		],
	},
	{
		path: "/work-order",
		component: MainLayout,
		meta: { breadcrumb: false },
		children: [
			{
				path: "",
				name: "Work Order List",
				component: () => import("@/views/WorkOrder/WorkOrderList.vue"),
				meta: { requiresAuth: true, permission: ["read", "WorkOrder"] },
			},
			{
				path: "form/:id?",
				name: "Work Order Form",
				component: () => import("@/views/WorkOrder/WorkOrderForm.vue"),
				meta: { requiresAuth: true, permission: ["read", "WorkOrder"] },
			},
			{
				path: "detail/:id",
				name: "Work Order Detail",
				component: () => import("@/views/WorkOrder/WorkOrderDetail.vue"),
				meta: { requiresAuth: true, permission: ["read", "WorkOrder"] },
			},
		],
	},
	{
		path: "/error",
		name: "Error",
		component: () => import("@/views/Error/index.vue"),
		meta: { requiresAuth: false },
	},
	{
		path: "/:pathMatch(.*)*",
		redirect: "/error?code=404",
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// auth guard

router.beforeEach(async (to) => {
	const token = localStorage.getItem("authToken");

	const publicPaths = [
		"/account/login",
		"/account/forgot-password",
		"/account/reset-password",
		"/account/activate",
		"/error",
	];

	const isPublic = publicPaths.some((path) => to.path.startsWith(path));

	if (!isPublic && !token) {
		return "/account/login";
	}

	const permission = to.meta.permission as [string, string] | undefined;
	if (token && permission) {
		const authStore = useAuthStore();
		if (!authStore.currentUser) await authStore.fetchMe();

		// Bypass permission check if viewing own profile
		const isOwnProfile =
			to.path === "/user/profile" &&
			(!to.query.code ||
				to.query.code === authStore.currentUser?.guid ||
				to.query.code === authStore.currentUser?.code ||
				to.query.code === authStore.currentUser?.displayCode);

		if (!isOwnProfile && !authStore.can(permission[0], permission[1])) return "/error?code=403";
	}
});

export default router;
