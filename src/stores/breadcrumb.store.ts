import { defineStore } from "pinia";

export interface BreadcrumbItem {
	label: string;
	to?: string;
}

export const useBreadcrumbStore = defineStore("breadcrumb", {
	state: () => ({
		customItems: null as BreadcrumbItem[] | null,
	}),
	actions: {
		setItems(items: BreadcrumbItem[]) {
			this.customItems = items;
		},
		clear() {
			this.customItems = null;
		},
	},
});
