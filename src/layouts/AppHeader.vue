<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { MeResponse } from "@/api/auth/auth.types";
import { getAvatarUrl } from "@/utils/avatar";

const props = defineProps<{
	currentUser: MeResponse | null;
}>();

const emit = defineEmits<{
	(e: "toggle-sidebar"): void;
	(e: "open-logout"): void;
}>();

const route = useRoute();
const isAccountOpenMobile = defineModel<boolean>("isAccountOpenMobile", { default: false });

const isOwnProfileActive = computed(() => {
	if (route.path !== "/user/profile") return false;
	if (route.query.mode === "new") return false;
	const code = route.query.code as string;
	if (!code) return true;
	return !!(props.currentUser?.guid && code === props.currentUser.guid);
});

function handleLogoutClick() {
	isAccountOpenMobile.value = false;
	emit("open-logout");
}
</script>

<template>
	<header class="header">
		<div class="header-left">
			<button class="btn btn--icon" @click="emit('toggle-sidebar')" aria-label="Toggle Menu">
				<i class="mdi mdi-menu"></i>
			</button>
			<img src="../assets/logo.svg" alt="GS TECH" class="header__logo" />
		</div>

		<div class="header-right">
			<!-- Notifications -->
			<button class="btn btn--icon" aria-label="Notifications">
				<i class="mdi mdi-bell-outline"></i>
			</button>

			<!-- Account -->
			<div class="account-menu-wrapper">
				<button
					class="icon-btn account-btn"
					@click.stop="isAccountOpenMobile = !isAccountOpenMobile"
					aria-label="Account"
				>
					<i class="mdi mdi-account-circle-outline"></i>
				</button>

				<div v-if="isAccountOpenMobile" class="account-dropdown">
					<div class="account-dropdown__header">
						<div class="account-dropdown__avatar">
							<img
								v-if="currentUser?.profileImage"
								:src="getAvatarUrl(currentUser.profileImage)"
								alt="Avatar"
							/>
							<i v-else class="mdi mdi-account"></i>
						</div>
						<div class="account-dropdown__info">
							<p class="account-dropdown__name">
								{{ currentUser?.displayName || "Loading..." }}
							</p>
							<p class="account-dropdown__email">{{ currentUser?.email || "" }}</p>
						</div>
					</div>
					<div class="account-dropdown__divider"></div>
					<router-link
						to="/user/profile"
						class="account-dropdown__item"
						:class="{ 'account-dropdown__item--active': isOwnProfileActive }"
						active-class=""
						exact-active-class=""
						@click="isAccountOpenMobile = false"
					>
						<i class="mdi mdi-account-cog-outline"></i> My Profile
					</router-link>
					<button
						class="account-dropdown__item account-dropdown__item--danger"
						@click="handleLogoutClick"
					>
						<i class="mdi mdi-logout"></i> Logout
					</button>
				</div>
			</div>
		</div>
	</header>
</template>
