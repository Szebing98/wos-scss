import MainLayout from "@/layouts/MainLayout.vue";
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
		redirect: "/",
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
				meta: { requiresAuth: true },
			},
			{
				path: "settings",
				name: "Settings",
				component: () => import("@/views/Settings/index.vue"),
				meta: { requiresAuth: true },
			}
		],
	},
	{
		path: "/customer",
		component: MainLayout,
		children: [
			{
				path: "list",
				name: "Customer List",
				component: () => import("@/views/Customer/CustomerList.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "profile",
				name: "Customer Profile",
				component: () => import("@/views/Customer/CustomerProfile.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "form",
				name: "Customer Form",
				component: () => import("@/views/Customer/CustomerForm.vue"),
				meta: { requiresAuth: true },
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
				meta: { requiresAuth: true },
			},
			{
				path: "location",
				name: "Location",
				component: () => import("@/views/Maintenance/Location.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "parts",
				name: "Part Replaced",
				component: () => import("@/views/Maintenance/PartReplaced.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "services",
				name: "Service Provided",
				component: () => import("@/views/Maintenance/ServiceProvided.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "doc-no-format",
				name: "Document No. Format",
				component: () => import("@/views/Maintenance/DocNoFormat.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "role-permission",
				name: "Role Permission",
				component: () => import("@/views/Maintenance/RolePermission.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "user-permission",
				name: "User Permission",
				component: () => import("@/views/Maintenance/UserPermission.vue"),
				meta: { requiresAuth: true },
			},
		],
	},
	{
		path: "/user",
		component: MainLayout,
		children: [
			{
				path: "list",
				name: "User List",
				component: () => import("@/views/User/UserList.vue"),
			},
			{
				path: "profile",
				name: "User Profile",
				component: () => import("@/views/User/UserProfile.vue"),
			},
		],
	},
	{
		path: "/work-order",
		component: MainLayout,
		children: [
			{
				path: "",
				name: "Work Orders",
				component: () => import("@/views/WorkOrder/WorkOrderList.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "form/:id?",
				name: "Work Order Form",
				component: () => import("@/views/WorkOrder/WorkOrderForm.vue"),
				meta: { requiresAuth: true },
			},
			{
				path: "detail/:id",
				name: "Work Order Detail",
				component: () => import("@/views/WorkOrder/WorkOrderDetail.vue"),
				meta: { requiresAuth: true },
			},
		],
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// auth guard

router.beforeEach((to) => {
	const token = localStorage.getItem("authToken");

	const publicPaths = [
		"/account/login",
		"/account/forgot-password",
		"/account/reset-password",
		"/account/activate"
	];

	const isPublic = publicPaths.some(path => to.path.startsWith(path));

	if (!isPublic && !token) {
		return "/account/login";
	}
});

export default router;
