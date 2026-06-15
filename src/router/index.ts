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
		children: [
			{
				path: "dashboard",
				name: "Dashboard",
				component: () => import("@/views/Dashboard/index.vue"),
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

	if (to.meta.requiresAuth && !token) {
		return "/account/login";
	} else if (to.meta.guestOnly && token) {
		return "/dashboard";
	}
});

export default router;
