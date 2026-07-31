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
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<div class="title-with-badge">
					<h1>Site Management</h1>
					<Badge type="info" icon="mdi-map-marker-multiple">{{ siteCountText }}</Badge>
				</div>
				<p class="maintenance-view__subtitle">
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
@use "@/styles/base/mixins" as *;

.status-toggle-btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.15s ease;
	border: 1px solid transparent;

	&--active {
		background-color: var(--colors-bg-success-subtle, #ecfdf5);
		color: var(--colors-text-success, #10b981);
		border-color: rgba(16, 185, 129, 0.3);

		&:hover {
			background-color: rgba(16, 185, 129, 0.2);
		}
	}

	&--inactive {
		background-color: var(--colors-bg-muted-subtle, #f3f4f6);
		color: var(--colors-text-muted, #6b7280);
		border-color: rgba(107, 114, 128, 0.3);

		&:hover {
			background-color: rgba(107, 114, 128, 0.2);
		}
	}

	i {
		font-size: 14px;
	}
}

.maintenance-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-md);
	}

	&__title-area {
		display: flex;
		flex-direction: column;
		gap: 4px;

		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0;
			color: var(--colors-text-primary);
		}
	}

	&__subtitle {
		font-size: 13px;
		color: var(--colors-text-muted);
		margin: 0;
	}
}

.title-with-badge {
	display: flex;
	align-items: center;
	gap: 10px;
}

.add-site-btn {
	flex-shrink: 0;
	white-space: nowrap;

	@media (max-width: 640px) {
		padding: 8px 12px !important;
		min-width: 40px;
		
		.btn-text {
			display: none;
		}
	}
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: var(--spacing-md);
}

.btn--icon-success {
	color: #10b981;
	background-color: rgba(16, 185, 129, 0.1);
	border: 1px solid rgba(16, 185, 129, 0.25);

	&:hover {
		background-color: rgba(16, 185, 129, 0.2);
		color: #059669;
	}
}

.btn--icon-muted {
	color: #6b7280;
	background-color: rgba(107, 114, 128, 0.1);
	border: 1px solid rgba(107, 114, 128, 0.25);

	&:hover {
		background-color: rgba(107, 114, 128, 0.2);
		color: #4b5563;
	}
}

.stat-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	gap: 18px;
	padding: var(--spacing-lg) var(--spacing-md);

	&__icon {
		width: 54px;
		height: 54px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		margin: 0 auto 6px auto;

		&--primary {
			background: rgba(80, 88, 242, 0.1);
			color: var(--colors-brand-primary);
		}
		&--success {
			background: rgba(16, 185, 129, 0.1);
			color: #10b981;
		}
		&--warning {
			background: rgba(245, 158, 11, 0.1);
			color: #f59e0b;
		}
	}

	&__info {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	&__label {
		font-size: 12px;
		font-weight: 600;
		color: var(--colors-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	&__value {
		font-size: 24px;
		font-weight: 800;
		color: var(--colors-text-primary);
		line-height: 1.2;
		margin-top: 2px;
	}
}

.filter-panel {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: var(--radius-xxs, 12px);
	padding: var(--spacing-md);
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: var(--spacing-md);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);

	&__left {
		display: flex;
		align-items: center;
		gap: var(--spacing-lg);
		flex-grow: 1;
		max-width: 600px;
	}
}

.view-toggle {
	display: flex;
	background-color: var(--colors-surface-background);
	padding: 3px;
	border-radius: 8px;

	&__btn {
		background: transparent;
		border: none;
		padding: 6px 12px;
		border-radius: 6px;
		color: var(--colors-text-muted);
		cursor: pointer;
		display: inline-flex;
		font-size: 16px;
		transition: all 0.2s;

		&:hover {
			color: var(--colors-text-primary);
		}
		&--active {
			background: var(--colors-surface-card);
			color: var(--colors-brand-primary);
			box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
		}
	}
}

.site-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: var(--spacing-md);
}

.site-card {
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: var(--spacing-md);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--spacing-md);
	transition: all 0.22s ease;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);

	&:hover {
		transform: translateY(-2px);
		border-color: var(--colors-brand-primary);
		box-shadow: 0 8px 24px rgba(80, 88, 242, 0.08);
	}

	&--disabled {
		opacity: 0.65;
		border-style: dashed;
	}

	&__header {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	&__badge-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	&__code-badge {
		background: rgba(80, 88, 242, 0.08);
		color: var(--colors-brand-primary);
		padding: 2px 8px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 700;
	}

	&__title {
		font-size: 16px;
		font-weight: 700;
		margin: 0;
		color: var(--colors-text-primary);
	}

	&__description {
		font-size: 13px;
		color: var(--colors-text-muted);
		margin: 0;
		line-height: 1.4;
		flex-grow: 1;
	}

	&__footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--colors-surface-border);
	}

	&__date {
		font-size: 11px;
		color: var(--colors-text-muted);
	}

	&__actions {
		display: flex;
		gap: 4px;
	}
}

.empty-card-state {
	grid-column: 1 / -1;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	padding: 48px 24px;
	text-align: center;
	color: var(--colors-text-muted);

	&__icon {
		font-size: 3rem;
		opacity: 0.2;
		margin-bottom: 12px;
	}
}

.form-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing-md);
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 6px;

	&--full {
		grid-column: span 2;
	}

	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}

	&__textarea {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 6px;
		font-size: 13px;
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
		background: var(--colors-surface-background);
		color: var(--colors-text-primary);
		&:focus {
			border-color: var(--colors-brand-primary);
		}
	}
}

.switch-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	input {
		display: none;
	}
	&__slider {
		width: 34px;
		height: 18px;
		background-color: var(--colors-surface-border);
		border-radius: 20px;
		position: relative;
		transition: background-color 0.2s;
		&::before {
			content: "";
			position: absolute;
			left: 2px;
			top: 2px;
			width: 14px;
			height: 14px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s;
		}
	}
	input:checked + &__slider {
		background-color: var(--status-completed);
		&::before {
			transform: translateX(16px);
			background-color: #ffffff;
		}
	}
	&__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.btn--icon-danger {
	color: #ef4444;
	&:hover {
		background-color: rgba(239, 68, 68, 0.1);
	}
}

.btn--danger {
	background-color: #ef4444;
	color: white;
	&:hover {
		background-color: #dc2626;
	}
}

.u-font-mono {
	font-family: monospace;
}
.u-font-weight-bold {
	font-weight: 700;
}
.u-text-primary {
	color: var(--colors-brand-primary);
}
.u-text-muted {
	color: var(--colors-text-muted);
}
.u-required {
	color: #ef4444;
}
</style>
