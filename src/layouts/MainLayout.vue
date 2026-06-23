<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useThemeStore } from "@/stores/theme.store";
import { authApi } from "@/api/auth/auth.api";
import type { MeResponse } from "@/api/auth/auth.types";

import AppHeader from "./AppHeader.vue";
import AppSidebar from "./AppSidebar.vue";
import AppFooter from "./AppFooter.vue";
import LogoutDialog from "./LogoutDialog.vue";

const themeStore = useThemeStore();

const isDocked = ref(false);
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(false);

const isAccountOpenMobile = ref(false);
const isLogoutDialogOpen = ref(false);

const route = useRoute();
const router = useRouter();

const currentUser = ref<MeResponse | null>(null);

async function loadUser() {
	const { data, error } = await authApi.me();
	if (data) {
		currentUser.value = data;
	} else if (error) {
		console.error("Failed to load user profile:", error);
	}
}

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
	() => {
		if (isMobile.value) {
			isMenuOpen.value = false;
			isAccountOpenMobile.value = false;
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
	} else {
		isAccountOpenMobile.value = false;
	}
}

onMounted(() => {
	loadUser();
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

		<div
			v-if="isMobile && isAccountOpenMobile"
			class="overlay"
			@click="isAccountOpenMobile = false"
		></div>
		<!-- Header -->
		<AppHeader
			v-model:isAccountOpenMobile="isAccountOpenMobile"
			:dark-theme="themeStore.dark"
			:current-user="currentUser"
			@toggle-sidebar="toggleSidebar"
			@toggle-theme="themeStore.toggleTheme()"
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
				<AppFooter />
			</main>
		</div>

		<LogoutDialog v-model="isLogoutDialogOpen" @confirm="handleLogout" />
	</div>
</template>
