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
		],
	},
	{
		path: "/dashboard",
		name: "Dashboard",
		component: () => import("@/views/Dashboard/index.vue"),
		meta: { requiresAuth: true },
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
