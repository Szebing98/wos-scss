<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { useBreadcrumbStore, type BreadcrumbItem } from "@/stores/breadcrumb.store";

const route = useRoute();
const breadcrumbStore = useBreadcrumbStore();

// Reset custom breadcrumbs on route change
watch(
	() => route.path,
	() => {
		breadcrumbStore.clear();
	}
);

const computedItems = computed<BreadcrumbItem[]>(() => {
	if (breadcrumbStore.customItems && breadcrumbStore.customItems.length > 0) {
		const hasHome = breadcrumbStore.customItems.some(
			(item) => item.label === "Home" || item.to === "/dashboard"
		);
		if (!hasHome) {
			return [{ label: "Home", to: "/dashboard" }, ...breadcrumbStore.customItems];
		}
		return breadcrumbStore.customItems;
	}

	const items: BreadcrumbItem[] = [{ label: "Home", to: "/dashboard" }];
	const matched = route.matched.filter((r) => r.meta?.breadcrumb !== false);

	matched.forEach((m) => {
		if (m.path === "" || m.path === "/" || m.path === "/dashboard" || m.path.endsWith("/dashboard")) return;

		let label = (m.meta?.breadcrumb as string) || (m.name as string);

		if (!label && m.path) {
			const segment = m.path.split("/").filter(Boolean).pop() || "";
			label = segment
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");
		}

		if (label) {
			items.push({
				label,
				to: m.redirect ? undefined : m.path,
			});
		}
	});

	if (items.length === 1 && route.path !== "/dashboard" && route.path !== "/") {
		const segments = route.path.split("/").filter(Boolean);
		let currentPath = "";

		segments.forEach((seg, idx) => {
			currentPath += `/${seg}`;
			const formattedLabel = seg
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ");

			items.push({
				label: formattedLabel,
				to: idx === segments.length - 1 ? undefined : currentPath,
			});
		});
	}

	return items;
});
</script>

<template>
	<nav class="page-breadcrumbs" aria-label="Breadcrumb">
		<ol class="breadcrumbs__list">
			<li
				v-for="(item, index) in computedItems"
				:key="index"
				class="breadcrumbs__item"
			>
				<span v-if="index > 0" class="breadcrumbs__separator">
					<i class="mdi mdi-chevron-right"></i>
				</span>
				<router-link v-if="item.to && index < computedItems.length - 1" :to="item.to" class="breadcrumbs__link">
					{{ item.label }}
				</router-link>
				<span v-else class="breadcrumbs__current">
					{{ item.label }}
				</span>
			</li>
		</ol>
	</nav>
</template>

<style lang="scss" scoped>
.page-breadcrumbs {
	display: flex;
	align-items: center;
	margin-bottom: 12px;
}

.breadcrumbs__list {
	display: flex;
	align-items: center;
	list-style: none;
	margin: 0;
	padding: 0;
	gap: 4px;
	font-family: inherit;
	font-size: 13px;
	line-height: 1.4;
	white-space: nowrap;
}

.breadcrumbs__item {
	display: flex;
	align-items: center;
	gap: 4px;
	color: var(--colors-text-muted);
}

.breadcrumbs__separator {
	display: flex;
	align-items: center;
	color: var(--colors-text-muted);
	font-size: 14px;
	opacity: 0.4;
}

.breadcrumbs__link {
	color: var(--colors-brand-primary);
	text-decoration: none;
	font-weight: 500;
	transition: opacity 0.15s ease;

	&:hover {
		text-decoration: underline;
		opacity: 0.85;
	}
}

.breadcrumbs__current {
	color: var(--colors-text-secondary);
	font-weight: 600;
}
</style>
