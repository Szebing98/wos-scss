import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		path: "/",
		redirect: "/login",
	},
	{
		path: "/login",
		component: () => import("@/views/Account/Login.vue"),
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// auth guard
router.beforeEach((to, _, next) => {
	const token = localStorage.getItem("authToken");

	if (to.meta.requiresAuth && !token) {
		next("/login");
	} else {
		next();
	}
});

export default router;
