<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useThemeStore } from "@/stores/theme.store";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

const themeStore = useThemeStore();

const isDocked = ref(false);
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(false);

const isAccountMenuOpen = ref(false);
const isLogoutDialogOpen = ref(false);
const router = useRouter();

function handleLogout() {
	localStorage.removeItem("authToken");
	isLogoutDialogOpen.value = false;
	router.push("/account/login");
}

function handleClickOutside(e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (!target.closest(".account-menu-wrapper")) {
		isAccountMenuOpen.value = false;
	}
}

const groups = reactive({
	workOrders: true,
	maintenance: false,
});

function toggleSidebar() {
	if (isMobile.value) {
		isMenuOpen.value = !isMenuOpen.value;
	} else {
		if (isTablet.value) {
			isTablet.value = false;
			isDesktop.value = true;
			isDocked.value = false;
		} else {
			isDocked.value = !isDocked.value;
		}
	}
}

function toggleGroup(key: "workOrders" | "maintenance") {
	if (isDocked.value || isTablet.value) {
		isDocked.value = false;
		isTablet.value = false;
		isDesktop.value = true;
		Object.keys(groups).forEach((k) => {
			groups[k as keyof typeof groups] = false;
		});
		groups[key] = true;
		return;
	}
	const isExpanding = !groups[key];
	if (isExpanding) {
		Object.keys(groups).forEach((k) => {
			groups[k as keyof typeof groups] = false;
		});
	}
	groups[key] = isExpanding;
}

function toggleTheme() {
	themeStore.toggleTheme();
}

const route = useRoute();

watch(
	() => route.path,
	() => {
		if (isMobile.value) {
			isMenuOpen.value = false;
		}
	},
);

function handleResize() {
	const width = window.innerWidth;

	isMobile.value = width < 768;
	isTablet.value = width >= 768 && width <= 1024;
	isDesktop.value = width > 1024;

	if (isMobile.value) {
		isMenuOpen.value = false;
	}
}

onMounted(() => {
	handleResize();
	window.addEventListener("resize", handleResize);
	document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
	window.removeEventListener("resize", handleResize);
	document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
	<div class="app-layout" :class="{ 'app-layout--dark': themeStore.dark }">
		<div v-if="isMobile && isMenuOpen" class="overlay" @click="isMenuOpen = false"></div>

		<header class="header">
			<div class="header-left">
				<button class="btn btn--icon" @click="toggleSidebar" aria-label="Toggle Menu">
					<i class="mdi mdi-menu"></i>
				</button>
				<img src="../assets/logo.svg" alt="GS TECH" class="header__logo" />
			</div>

			<div class="header-right">
				<button class="btn btn--icon" aria-label="Notifications">
					<i class="mdi mdi-bell-outline"></i>
				</button>

				<button class="btn btn--icon" @click="toggleTheme" aria-label="Toggle Theme">
					<i
						class="mdi"
						:class="themeStore.dark ? 'mdi-brightness-4' : 'mdi-brightness-7'"
					></i>
				</button>

				<div class="account-menu-wrapper">
					<button
						class="icon-btn account-btn"
						@click.stop="isAccountMenuOpen = !isAccountMenuOpen"
						aria-label="Account"
					>
						<i class="mdi mdi-account-circle-outline"></i>
					</button>
					<div v-if="isAccountMenuOpen" class="account-dropdown">
						<div class="account-dropdown__header">
							<div class="account-dropdown__avatar">
								<i class="mdi mdi-account"></i>
							</div>
							<div class="account-dropdown__info">
								<p class="account-dropdown__name">System User</p>
								<p class="account-dropdown__email">user@gstech.com</p>
							</div>
						</div>
						<div class="account-dropdown__divider"></div>
						<router-link
							to="/user/profile"
							class="account-dropdown__item"
							@click="isAccountMenuOpen = false"
						>
							<i class="mdi mdi-account-cog-outline"></i> My Profile
						</router-link>
						<button
							class="account-dropdown__item account-dropdown__item--danger"
							@click="
								isLogoutDialogOpen = true;
								isAccountMenuOpen = false;
							"
						>
							<i class="mdi mdi-logout"></i> Logout
						</button>
					</div>
				</div>
			</div>
		</header>

		<div class="app-container">
			<aside
				class="side-menu"
				:class="{
					'is-mobile': isMobile,
					'is-open': isMobile ? isMenuOpen : true,
					'is-rail': (isDesktop && isDocked) || isTablet,
				}"
			>
				<div class="sidebar_header" v-if="isMobile">
					<button class="icon-btn close" @click="isMenuOpen = false">
						<i class="mdi mdi-close"></i>
					</button>
				</div>

				<nav class="nav">
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
									:class="{ 'nav__child-active': route.query.status === 'PendingApproval' }"
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
						active-class="nav__item--active"
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
									to="/maintenance/work-types"
									class="nav__child"
									active-class="nav__child-active"
									><span>Work Type</span></router-link
								>
							</li>
							<li>
								<router-link
									to="/maintenance/parts"
									class="nav__child"
									active-class="nav__child-active"
									><span>Parts Change</span></router-link
								>
							</li>
							<li>
								<router-link
									to="/maintenance/services"
									class="nav__child"
									active-class="nav__child-active"
									><span>Service Provided</span></router-link
								>
							</li>
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

			<main
				class="app-main"
				:class="{
					'app-main--rail': (isDesktop && isDocked) || isTablet,
				}"
			>
				<!-- Content -->
				<div class="app-content">
					<router-view />
				</div>

				<!-- Footer -->
				<footer class="app-footer">
					<p>Copyright © 2026</p>
					<p>(Version 1.0.1.20260410.1.0a)</p>
					<p>Asiasoft Business Solutions 200801030089 (831418-H).</p>
					<p>All rights reserved.</p>
				</footer>
			</main>
		</div>

		<Dialog v-model="isLogoutDialogOpen" title="Confirm Logout">
			<div class="logout-dialog-content">
				<i class="mdi mdi-logout-variant logout-dialog-icon"></i>
				<p>Are you sure you want to log out?</p>
				<span class="logout-dialog-sub"
					>You will need to sign in again to access the system.</span
				>
			</div>
			<template #footer>
				<Button variant="secondary" @click="isLogoutDialogOpen = false">Cancel</Button>
				<Button variant="danger" @click="handleLogout">Logout</Button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
.header-right {
	display: flex;
	align-items: center;
	gap: 16px;

	.btn i,
	.icon-btn i {
		font-size: 24px;
	}
}

.account-menu-wrapper {
	position: relative;
}

.account-dropdown {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	width: 240px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
	z-index: 100;
	overflow: hidden;
	animation: slideDown 0.2s ease;

	&__header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--colors-surface-background);
	}

	&__avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--colors-brand-primary);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
	}

	&__info {
		display: flex;
		flex-direction: column;
	}

	&__name {
		margin: 0;
		font-size: 14px;
		font-weight: 700;
		color: var(--colors-text-primary);
	}

	&__email {
		margin: 0;
		font-size: 12px;
		color: var(--colors-text-muted);
	}

	&__divider {
		height: 1px;
		background: var(--colors-surface-border);
		margin: 4px 0;
	}

	&__item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--colors-text-primary);
		text-decoration: none;
		background: transparent;
		border: none;
		width: 100%;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s;

		i {
			font-size: 18px;
			color: var(--colors-text-muted);
		}

		&:hover {
			background: var(--colors-surface-hover);
			color: var(--colors-brand-primary);
			i {
				color: var(--colors-brand-primary);
			}
		}

		&--danger {
			&:hover {
				background: var(--colors-state-danger-light, rgba(239, 68, 68, 0.05));
				color: var(--colors-state-danger, #ef4444);
				i {
					color: var(--colors-state-danger, #ef4444);
				}
			}
		}
	}
}

.logout-dialog-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 8px;
	padding: 20px 0;

	.logout-dialog-icon {
		font-size: 48px;
		color: var(--colors-state-warning, #f59e0b);
		margin-bottom: 8px;
	}

	p {
		font-size: 16px;
		font-weight: 700;
		color: var(--colors-text-primary);
		margin: 0;
	}

	.logout-dialog-sub {
		font-size: 13px;
		color: var(--colors-text-muted);
	}
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
