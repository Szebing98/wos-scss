<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useThemeStore } from "@/stores/theme.store";
import { useAuthStore } from "@/stores/auth.store";

import AppHeader from "./AppHeader.vue";
import AppSidebar from "./AppSidebar.vue";
import AppFooter from "./AppFooter.vue";
import LogoutDialog from "./LogoutDialog.vue";
import Snackbar from "@/components/Snackbar.vue";
import Breadcrumbs from "@/components/Breadcrumbs.vue";

const themeStore = useThemeStore();
const authStore = useAuthStore();

const isDocked = ref(false);
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(false);

const isAccountOpenMobile = ref(false);
const isLogoutDialogOpen = ref(false);
const mainRef = ref<HTMLElement | null>(null);

const route = useRoute();
const router = useRouter();

// Fetch once on mount and cache in store — Header will react to store changes automatically
onMounted(async () => {
	if (!authStore.currentUser) {
		await authStore.fetchMe();
	}
	handleResize();
	window.addEventListener("resize", handleResize);
	document.addEventListener("click", handleClickOutside);
});

function handleLogout() {
	localStorage.removeItem("authToken");
	isLogoutDialogOpen.value = false;
	router.push("/account/login");
}

function handleClickOutside(e: MouseEvent) {
	const target = e.target as HTMLElement;
	if (!target.closest(".account-menu-wrapper")) {
		isAccountOpenMobile.value = false;
	}
}

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

watch(
	() => route.path,
	async () => {
		if (isMobile.value) {
			isMenuOpen.value = false;
			isAccountOpenMobile.value = false;
		}

		// The layout owns the scroll container, so reset it when navigating
		// between pages that reuse this same MainLayout instance.
		await nextTick();
		mainRef.value?.scrollTo({ top: 0, left: 0, behavior: "auto" });
	},
);

function handleResize() {
	const width = window.innerWidth;

	isMobile.value = width < 768;
	isTablet.value = width >= 768 && width <= 1024;
	isDesktop.value = width > 1024;

	if (isMobile.value) {
		isMenuOpen.value = false;
	} else {
		isAccountOpenMobile.value = false;
	}
}

onUnmounted(() => {
	window.removeEventListener("resize", handleResize);
	document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
	<div class="app-layout" :class="{ 'app-layout--dark': themeStore.dark }">
		<div v-if="isMobile && isMenuOpen" class="overlay" @click="isMenuOpen = false"></div>

		<div
			v-if="isMobile && isAccountOpenMobile"
			class="overlay"
			@click="isAccountOpenMobile = false"
		></div>
		<!-- Header -->
		<AppHeader
			v-model:isAccountOpenMobile="isAccountOpenMobile"
			:current-user="authStore.currentUser"
			@toggle-sidebar="toggleSidebar"
			@open-logout="isLogoutDialogOpen = true"
		/>

		<div class="app-container">
			<!-- Sidebar -->
			<AppSidebar
				v-model:isMenuOpen="isMenuOpen"
				v-model:isDocked="isDocked"
				v-model:isTablet="isTablet"
				v-model:isDesktop="isDesktop"
				:is-mobile="isMobile"
			/>

			<main
				ref="mainRef"
				class="app-main"
				:class="{
					'app-main--rail': (isDesktop && isDocked) || isTablet,
				}"
			>
				<!-- Content -->
				<div class="app-content">
					<Breadcrumbs />
					<router-view />
				</div>

				<!-- Footer -->
				<AppFooter />
			</main>
		</div>

		<LogoutDialog v-model="isLogoutDialogOpen" @confirm="handleLogout" />
		<Snackbar />
	</div>
</template>
