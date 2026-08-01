<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Card from "@/components/Card.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Badge from "@/components/Badge.vue";
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import type { SiteModel } from "@/api/maintenance/site/site.types";

const viewMode = ref<"card" | "table">("card");
const searchString = ref("");
const filterStatus = ref("all");
const isLoading = ref(false);
const dateFormatStore = useDateFormatStore();

const isDialogOpen = ref(false);
const isNewRecord = ref(false);
const selectedSite = ref<SiteModel | null>(null);

const formData = ref<Partial<SiteModel>>({
	guid: "",
	code: "",
	name: "",
	description: "",
	isActive: true,
});

import { useAuthStore } from "@/stores/auth.store";
import http from "@/utils/http";

const authStore = useAuthStore();

const sites = ref<SiteModel[]>([]);

const tableHeaders = computed<TableHeader[]>(() => {
	const baseHeaders: TableHeader[] = [
		{ key: "code", label: "Site Code", width: "150px", minWidth: "130px" },
		{ key: "name", label: "Site Name", width: "220px", minWidth: "170px" },
		{ key: "description", label: "Description", width: "auto", minWidth: "200px" },
		{ key: "createdAt", label: "Added", width: "140px", minWidth: "120px" },
		{ key: "status", label: "Status", width: "130px", minWidth: "110px" },
	];
	if (authStore.can("update", "Site")) {
		baseHeaders.push({ key: "actions", label: "Actions", align: "right", width: "130px", minWidth: "110px" });
	}
	return baseHeaders;
});

async function fetchSites() {
	isLoading.value = true;
	try {
		const res = await http.get("/site", { params: { pageSize: 100 } });
		const rawData = res?.data?.data || res?.data?.items || res?.data || [];
		sites.value = Array.isArray(rawData) ? rawData : [];
	} catch (err) {
		console.error("Failed to fetch sites:", err);
		sites.value = [];
	} finally {
		isLoading.value = false;
	}
}

onMounted(() => {
	fetchSites();
});

const filteredSites = computed(() => {
	if (!sites.value) return [];
	return sites.value.filter((s) => {
		if (!s) return false;
		const search = searchString.value.toLowerCase();
		const matchesSearch =
			!searchString.value ||
			(s.code && s.code.toLowerCase().includes(search)) ||
			(s.name && s.name.toLowerCase().includes(search)) ||
			(s.description && s.description.toLowerCase().includes(search));

		const matchesStatus =
			filterStatus.value === "all" ||
			(filterStatus.value === "active" ? s.isActive : !s.isActive);

		return matchesSearch && matchesStatus;
	});
});

const totalSitesCount = computed(() => sites.value.length);
const activeSitesCount = computed(() => sites.value.filter((s) => s.isActive).length);
const disabledSitesCount = computed(() => sites.value.filter((s) => !s.isActive).length);

const siteCountText = computed(() => {
	const count = totalSitesCount.value;
	return count === 1 ? "1 Site" : `${count} Sites`;
});

function resetFilters() {
	filterStatus.value = "all";
	searchString.value = "";
}

function openCreateModal() {
	isNewRecord.value = true;
	formData.value = {
		guid: "",
		code: "",
		name: "",
		description: "",
		isActive: true,
	};
	isDialogOpen.value = true;
}

function openEditModal(site: SiteModel) {
	isNewRecord.value = false;
	selectedSite.value = site;
	formData.value = { ...site };
	isDialogOpen.value = true;
}

async function saveSite() {
	if (!formData.value.code?.trim() || !formData.value.name?.trim()) {
		alert("Site Code and Site Name are required.");
		return;
	}

	try {
		if (isNewRecord.value) {
			await http.post("/site", {
				code: formData.value.code.trim(),
				name: formData.value.name.trim(),
				description: formData.value.description || undefined,
				isActive: formData.value.isActive ?? true,
			});
		} else if (selectedSite.value?.guid) {
			await http.put(`/site/${selectedSite.value.guid}`, {
				name: formData.value.name.trim(),
				description: formData.value.description || undefined,
				isActive: formData.value.isActive ?? true,
			});
		}
		isDialogOpen.value = false;
		await fetchSites();
	} catch (e) {
		console.error("Failed to save site:", e);
	}
}

const isConfirmStatusOpen = ref(false);
const siteToToggle = ref<SiteModel | null>(null);

function requestToggleStatus(site: SiteModel) {
	siteToToggle.value = site;
	isConfirmStatusOpen.value = true;
}

async function confirmToggleStatus() {
	if (!siteToToggle.value?.guid) return;
	try {
		const newStatus = !siteToToggle.value.isActive;
		await http.put(`/site/${siteToToggle.value.guid}`, {
			name: siteToToggle.value.name,
			description: siteToToggle.value.description || undefined,
			isActive: newStatus,
		});
		isConfirmStatusOpen.value = false;
		siteToToggle.value = null;
		await fetchSites();
	} catch (e) {
		console.error("Failed to toggle site status:", e);
	}
}
</script>

<template>
	<div class="maintenance-view">
		<!-- Header with Title, Badge next to title, and Action Button on the right -->
		<div class="page-header">
			<div class="page-header__title-area">
				<div class="title-with-badge">
					<h1>Site Management</h1>
					<Badge type="info" icon="mdi-map-marker-multiple">{{ siteCountText }}</Badge>
				</div>
				<p class="page-header__subtitle">
					Configure facility locations, service branches, and work order operational sites
				</p>
			</div>
			<button v-if="authStore.can('create', 'Site')" class="btn btn--primary add-site-btn" @click="openCreateModal" style="display: flex; align-items: center; gap: 6px;">
				<i class="mdi mdi-plus"></i>
				<span class="btn-text">New Site</span>
			</button>
		</div>

		<!-- Overview Centered Stat Cards -->
		<div class="stats-grid">
			<Card class="stat-card">
				<div class="stat-card__icon stat-card__icon--primary">
					<i class="mdi mdi-domain"></i>
				</div>
				<div class="stat-card__info">
					<span class="stat-card__label">Total Sites</span>
					<span class="stat-card__value">{{ totalSitesCount }}</span>
				</div>
			</Card>

			<Card class="stat-card">
				<div class="stat-card__icon stat-card__icon--success">
					<i class="mdi mdi-check-circle-outline"></i>
				</div>
				<div class="stat-card__info">
					<span class="stat-card__label">Active Sites</span>
					<span class="stat-card__value">{{ activeSitesCount }}</span>
				</div>
			</Card>

			<Card class="stat-card">
				<div class="stat-card__icon stat-card__icon--warning">
					<i class="mdi mdi-pause-circle-outline"></i>
				</div>
				<div class="stat-card__info">
					<span class="stat-card__label">Inactive Sites</span>
					<span class="stat-card__value">{{ disabledSitesCount }}</span>
				</div>
			</Card>
		</div>

		<!-- Filter Bar -->
		<div class="filter-panel">
			<div class="filter-panel__left">
				<Textbox
					v-model="searchString"
					placeholder="Search site code or name..."
					style="flex: 1;"
					hide-footer
				>
					<template #prefix>
						<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 6px;"></i>
					</template>
				</Textbox>
				<FilterPanel show-reset align="right" @reset="resetFilters">
					<Select v-model="filterStatus" label="Status">
						<option value="all">All Status</option>
						<option value="active">Active Only</option>
						<option value="inactive">Inactive Only</option>
					</Select>
				</FilterPanel>
			</div>

			<div class="view-toggle">
				<button
					class="view-toggle__btn"
					:class="{ 'view-toggle__btn--active': viewMode === 'card' }"
					@click="viewMode = 'card'"
					title="Card Grid View"
				>
					<i class="mdi mdi-grid"></i>
				</button>
				<button
					class="view-toggle__btn"
					:class="{ 'view-toggle__btn--active': viewMode === 'table' }"
					@click="viewMode = 'table'"
					title="Table View"
				>
					<i class="mdi mdi-format-list-bulleted"></i>
				</button>
			</div>
		</div>

		<!-- Card Grid View -->
		<div v-if="viewMode === 'card'" class="site-grid">
			<div
				v-for="site in filteredSites"
				:key="site.guid"
				class="site-card"
				:class="{ 'site-card--disabled': !site.isActive }"
			>
				<div class="site-card__header">
					<div class="site-card__badge-row">
						<span class="site-card__code-badge u-font-mono">{{ site.code }}</span>
						<Badge :type="site.isActive ? 'success' : 'error'" size="sm">
							{{ site.isActive ? 'Active' : 'Inactive' }}
						</Badge>
					</div>
					<h3 class="site-card__title">{{ site.name }}</h3>
				</div>

				<p class="site-card__description">
					{{ site.description || "No description provided for this site." }}
				</p>

				<div class="site-card__footer">
					<span class="site-card__date" v-if="site.createdAt">
						Added: {{ dateFormatStore.formatDate(site.createdAt) }}
					</span>
					<div class="site-card__actions">
						<button v-if="authStore.can('update', 'Site')" class="btn btn--icon" @click="openEditModal(site)" title="Edit Site">
							<i class="mdi mdi-pencil"></i>
						</button>
						<button
							v-if="authStore.can('update', 'Site')"
							class="btn btn--icon"
							@click="requestToggleStatus(site)"
							:title="site.isActive ? 'Deactivate Site' : 'Activate Site'"
						>
							<i class="mdi" :class="site.isActive ? 'mdi-check-circle-outline' : 'mdi-pause-circle-outline'"></i>
						</button>
					</div>
				</div>
			</div>

			<div v-if="filteredSites.length === 0" class="empty-card-state">
				<i class="mdi mdi-domain-off empty-card-state__icon"></i>
				<p>No operational sites match your current filters.</p>
			</div>
		</div>

		<!-- Table View -->
		<div v-else>
			<Card class="table-card" style="padding: 0;">
				<Table
					paginate
					storageKey="site-maintenance"
					:headers="tableHeaders"
					:items="filteredSites"
					emptyMessage="No maintenance sites found."
				>
					<template #item-code="{ item }">
						<span class="u-font-mono u-font-weight-bold u-text-primary">{{ item.code }}</span>
					</template>
					<template #item-name="{ item }">
						<strong style="font-weight: 600">{{ item.name }}</strong>
					</template>
					<template #item-description="{ item }">
						<span class="u-text-muted">{{ item.description || "—" }}</span>
					</template>
					<template #item-createdAt="{ item }">
						{{ dateFormatStore.formatDate(item.createdAt) }}
					</template>
					<template #item-status="{ item }">
						<Badge :type="item.isActive ? 'success' : 'error'">
							{{ item.isActive ? "Active" : "Inactive" }}
						</Badge>
					</template>
					<template #item-actions="{ item }">
						<div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
							<button v-if="authStore.can('update', 'Site')" class="btn btn--icon" @click="openEditModal(item)" title="Edit Site">
								<i class="mdi mdi-pencil"></i>
							</button>
							<button
								v-if="authStore.can('update', 'Site')"
								class="btn btn--icon"
								@click="requestToggleStatus(item)"
								:title="item.isActive ? 'Deactivate Site' : 'Activate Site'"
							>
								<i class="mdi" :class="item.isActive ? 'mdi-check-circle-outline' : 'mdi-pause-circle-outline'"></i>
							</button>
						</div>
					</template>
				</Table>
			</Card>
		</div>

		<!-- Create / Edit Dialog Modal -->
		<Dialog v-model="isDialogOpen">
			<template #header>
				<h2>{{ isNewRecord ? "Create Maintenance Site" : "Edit Site Details" }}</h2>
				<p>Manage site master information for work order assignment</p>
			</template>

			<div class="form-grid">
				<div class="form-group form-group--full">
					<label class="form-group__label">Site Code <span class="u-required">*</span></label>
					<Textbox
						v-model="formData.code"
						:disabled="!isNewRecord"
						placeholder="e.g. HQ-KL, WH-PJ, SITE-01"
						class="u-font-mono"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label">Site Name <span class="u-required">*</span></label>
					<Textbox
						v-model="formData.name"
						placeholder="e.g. Kuala Lumpur Headquarters"
					/>
				</div>

				<div class="form-group form-group--full">
					<label class="form-group__label">Description / Location Notes</label>
					<textarea
						v-model="formData.description"
						rows="3"
						class="form-group__textarea"
						placeholder="Optional notes or facility description..."
					></textarea>
				</div>

				<div class="form-group form-group--full" style="padding-top: 8px;">
					<label class="switch-toggle">
						<input type="checkbox" v-model="formData.isActive" />
						<span class="switch-toggle__slider"></span>
						<span class="switch-toggle__label">Activate Site for Work Orders</span>
					</label>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--secondary" @click="isDialogOpen = false">
					Cancel
				</button>
				<button class="btn btn--primary" @click="saveSite">
					Save Site
				</button>
			</template>
		</Dialog>

		<!-- Status Toggle Confirmation Dialog -->
		<Dialog v-model="isConfirmStatusOpen">
			<template #header>
				<h2>Confirm Status Change</h2>
			</template>

			<p style="padding: 8px 0; font-size: 14px; line-height: 1.5;">
				Are you sure you want to {{ siteToToggle?.isActive ? 'deactivate' : 'activate' }} site
				<strong>"{{ siteToToggle?.name }}"</strong> ({{ siteToToggle?.code }})?
			</p>

			<template #footer>
				<button class="btn btn--secondary" @click="isConfirmStatusOpen = false">
					Cancel
				</button>
				<button class="btn btn--primary" @click="confirmToggleStatus">
					Confirm
				</button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_site.scss";
</style>
