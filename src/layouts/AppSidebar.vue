<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const props = defineProps<{
	isMobile: boolean;
	isTablet: boolean;
	isDesktop: boolean;
	isDocked: boolean;
	isMenuOpen: boolean;
}>();

const emit = defineEmits<{
	(e: "update:isMenuOpen", value: boolean): void;
	(e: "update:isDocked", value: boolean): void;
	(e: "update:isTablet", value: boolean): void;
	(e: "update:isDesktop", value: boolean): void;
}>();

const route = useRoute();
const authStore = useAuthStore();

const isEmployeesActive = computed(() => {
	if (route.path === "/user/list" || route.path === "/user/form" || route.query.mode === "new") {
		return true;
	}
	if (route.path.startsWith("/user/profile")) {
		const targetCode = route.query.code as string;
		if (!targetCode) return false;
		const currentGuid = authStore.currentUser?.guid || authStore.user?.guid;
		return !!(currentGuid && targetCode !== currentGuid);
	}
	return false;
});

const groups = reactive({
	workOrders: true,
	maintenance: false,
});

function toggleGroup(key: "workOrders" | "maintenance") {
	if (props.isDocked || props.isTablet) {
		emit("update:isDocked", false);
		emit("update:isTablet", false);
		emit("update:isDesktop", true);
	}
	groups.workOrders = key === "workOrders";
	groups.maintenance = key === "maintenance";
}

function syncOpenGroupWithRoute(path: string) {
	if (
		path.startsWith("/maintenance") ||
		path.startsWith("/customer") ||
		path.startsWith("/user")
	) {
		groups.workOrders = false;
		groups.maintenance = true;
	} else {
		groups.workOrders = true;
		groups.maintenance = false;
	}
}

watch(
	() => route.path,
	(newPath: string) => {
		syncOpenGroupWithRoute(newPath);
	},
	{ immediate: true },
);
</script>

<template>
	<aside
		class="side-menu"
		:class="{
			'is-mobile': isMobile,
			'is-open': isMobile ? isMenuOpen : true,
			'is-rail': (isDesktop && isDocked) || isTablet,
		}"
	>
		<nav class="nav">
			<!-- Dashboard -->
			<router-link
				class="nav__item"
				to="/dashboard"
				active-class="nav__item--active"
				exact-active-class="nav__item--active"
				title="Dashboard"
			>
				<i class="mdi mdi-view-dashboard nav__icon"></i>
				<span class="nav__label">Dashboard</span>
			</router-link>

			<!-- Work Order -->
			<div class="nav__group" :class="{ 'nav__group--expanded': groups.workOrders }">
				<router-link
					to="/work-order"
					class="nav__item"
					:class="{
						'nav__item--active-parent': route.path.startsWith('/work-order'),
					}"
					@click="groups.workOrders = true"
					title="Work Orders"
				>
					<i class="mdi mdi-clipboard-text-clock nav__icon"></i>
					<span class="nav__label">Work Orders</span>
					<i
						v-show="!((isDesktop && isDocked) || isTablet)"
						class="mdi nav__tail"
						:class="groups.workOrders ? 'mdi-chevron-up' : 'mdi-chevron-down'"
						@click.prevent.stop="toggleGroup('workOrders')"
					></i>
				</router-link>

				<ul
					class="nav__children"
					v-show="!((isDesktop && isDocked) || isTablet) && groups.workOrders"
				>
					<li>
						<router-link
							to="/work-order?status=New"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'New' }"
							><span>New</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=PendingApproval"
							class="nav__child"
							:class="{
								'nav__child-active': route.query.status === 'PendingApproval',
							}"
							><span>Pending Approval</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=InProgress"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'InProgress' }"
							><span>In Progress</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=Done"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'Done' }"
							><span>Done</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=Completed"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'Completed' }"
							><span>Completed</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=Claimed"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'Claimed' }"
							><span>Claimed</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=Closed"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'Closed' }"
							><span>Closed</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/work-order?status=Cancelled"
							class="nav__child"
							:class="{ 'nav__child-active': route.query.status === 'Cancelled' }"
							><span>Cancelled</span></router-link
						>
					</li>
				</ul>
			</div>

			<!-- Customers -->
			<router-link
				class="nav__item"
				to="/customer/list"
				:class="{ 'nav__item--active': route.path.startsWith('/customer') }"
				active-class="nav__item--active"
				title="Customers"
			>
				<i class="mdi mdi-account-box-multiple nav__icon"></i>
				<span class="nav__label">Customers</span>
			</router-link>

			<!-- Employees -->
			<router-link
				class="nav__item"
				to="/user/list"
				:class="{ 'nav__item--active': isEmployeesActive }"
				title="Employees"
			>
				<i class="mdi mdi-account-group nav__icon"></i>
				<span class="nav__label">Employees</span>
			</router-link>

			<!-- Maintenance -->
			<div class="nav__group" :class="{ 'nav__group--expanded': groups.maintenance }">
				<div
					class="nav__item"
					:class="{
						'nav__item--active-parent': route.path.startsWith('/maintenance'),
					}"
					@click="toggleGroup('maintenance')"
					title="Maintenance"
				>
					<i class="mdi mdi-tools nav__icon"></i>
					<span class="nav__label">Maintenance</span>
					<i
						v-show="!((isDesktop && isDocked) || isTablet)"
						class="mdi nav__tail"
						:class="groups.maintenance ? 'mdi-chevron-up' : 'mdi-chevron-down'"
					></i>
				</div>
				<ul
					class="nav__children"
					v-show="!((isDesktop && isDocked) || isTablet) && groups.maintenance"
				>
					<li>
						<router-link
							to="/maintenance/location"
							class="nav__child"
							active-class="nav__child-active"
							><span>Location</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/maintenance/site"
							class="nav__child"
							active-class="nav__child-active"
							><span>Site</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/maintenance/work-types"
							class="nav__child"
							active-class="nav__child-active"
							><span>Work Type</span></router-link
						>
					</li>
					<!-- <li>
						<router-link
							to="/maintenance/parts"
							class="nav__child"
							active-class="nav__child-active"
							><span>Part Info</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/maintenance/services"
							class="nav__child"
							active-class="nav__child-active"
							><span>Service Provided</span></router-link
						>
					</li> -->
					<li>
						<router-link
							to="/maintenance/doc-no-format"
							class="nav__child"
							active-class="nav__child-active"
							><span>Doc No Format</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/maintenance/role-permission"
							class="nav__child"
							active-class="nav__child-active"
							><span>Role Permission</span></router-link
						>
					</li>
					<li>
						<router-link
							to="/maintenance/user-permission"
							class="nav__child"
							active-class="nav__child-active"
							><span>User Permission</span></router-link
						>
					</li>
				</ul>
			</div>

			<!-- Audit Log -->
			<router-link
				class="nav__item"
				to="/audit-log"
				active-class="nav__item--active"
				title="Audit Log"
			>
				<i class="mdi mdi-history nav__icon"></i>
				<span class="nav__label">Audit Log</span>
			</router-link>

			<!-- Settings -->
			<router-link
				class="nav__item"
				to="/settings"
				active-class="nav__item--active"
				title="Settings"
			>
				<i class="mdi mdi-cog nav__icon"></i>
				<span class="nav__label">Settings</span>
			</router-link>

			<!-- About -->
			<router-link
				class="nav__item"
				to="/about"
				active-class="nav__item--active"
				title="About"
			>
				<i class="mdi mdi-information nav__icon"></i>
				<span class="nav__label">About</span>
			</router-link>
		</nav>
	</aside>
</template>
