<script setup lang="ts">
import { useThemeStore } from "@/stores/theme.store";
import Card from "@/components/Card.vue";
import Button from "@/components/Button.vue";

const themeStore = useThemeStore();
</script>

<template>
	<div class="settings-page page">
		<div class="settings-page__header">
			<h1>Settings</h1>
			<p class="u-text-muted">Manage your application preferences</p>
		</div>

		<Card bordered>
			<template #header>
				<h2 style="font-size: 18px;">Appearance</h2>
			</template>
			<div class="setting-item">
				<div>
					<h3 style="margin: 0 0 4px 0; font-size: 16px;">Theme Mode</h3>
					<p class="u-text-muted" style="margin: 0; font-size: 14px;">Toggle between Light and Dark mode</p>
				</div>
				<Button variant="outlined" @click="themeStore.toggleTheme()" style="display: flex; align-items: center; gap: 8px;">
					<i class="mdi" :class="themeStore.dark ? 'mdi-brightness-4' : 'mdi-brightness-7'" style="font-size: 18px;"></i>
					{{ themeStore.dark ? 'Dark Mode' : 'Light Mode' }}
				</Button>
			</div>
		</Card>
	</div>
</template>

<style lang="scss" scoped>
.settings-page {
	padding: var(--spacing-xl);
	
	&__header {
		margin-bottom: var(--spacing-xl);
		
		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0 0 4px 0;
			color: var(--colors-text-primary);
		}
	}
}

.setting-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing-md) 0;
}
</style>
