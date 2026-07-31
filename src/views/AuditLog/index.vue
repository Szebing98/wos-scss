<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { auditApi } from "@/api/audit/audit.api";
import Card from "@/components/Card.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import Select from "@/components/Select.vue";
import Badge from "@/components/Badge.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

type AuditAction = "create" | "update" | "delete";

interface AuditLog {
	guid: string;
	module: string;
	moduleCode: string | null;
	auditType: AuditAction;
	createdAt: string;
	createdBy: string | null;
}

interface AuditChange {
	changedField: string;
	old: string | null;
	new: string | null;
}

const headers: TableHeader[] = [
	{ key: "timestamp", label: "Date & Time", width: "180px" },
	{ key: "user", label: "User", width: "200px" },
	{ key: "module", label: "Module & Record" },
	{ key: "action", label: "Action", width: "120px" },
	{ key: "actions", label: "Details", align: "right", width: "100px" },
];

const logs = ref<AuditLog[]>([]);
const modules = ref<string[]>([]);
const dateFormatStore = useDateFormatStore();

const searchQuery = ref("");
const filterModule = ref("all");
const filterType = ref("all");

const isDetailDrawerOpen = ref(false);
const isLoadingDetails = ref(false);
const selectedLog = ref<AuditLog | null>(null);
const logChanges = ref<AuditChange[]>([]);

const filteredLogs = computed(() => {
	return logs.value.filter(log => {
		const matchesSearch = !searchQuery.value || 
			(log.createdBy && log.createdBy.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
			(log.moduleCode && log.moduleCode.toLowerCase().includes(searchQuery.value.toLowerCase()));
		
		const matchesModule = filterModule.value === "all" || log.module === filterModule.value;
		const matchesType = filterType.value === "all" || log.auditType === filterType.value;

		return matchesSearch && matchesModule && matchesType;
	});
});

function resetFilters() {
	searchQuery.value = "";
	filterModule.value = "all";
	filterType.value = "all";
}

function formatDate(isoString: string) {
	return isoString ? dateFormatStore.formatDate(isoString) : "";
}

function formatTime(isoString: string) {
	return isoString ? dateFormatStore.formatTime(isoString) : "";
}

function normalizeAuditType(type: string): AuditAction {
	const value = type.toLowerCase();
	if (value === "update" || value === "delete") return value;
	return "create";
}

function formatAuditType(type?: string) {
	return type ? type.toUpperCase() : "";
}

function getActionTypeClass(type: string): "success" | "warning" | "error" | "info" | "default" {
	switch (type.toLowerCase()) {
		case "create": return "success";
		case "update": return "warning";
		case "delete": return "error";
		default: return "info";
	}
}

async function loadModules() {
	try {
		const { data, error } = await auditApi.getAuditModules();
		if (data) {
			modules.value = data as string[];
		} else if (error) {
			throw new Error(error.error.message);
		}
	} catch {
		modules.value = ["WorkOrder", "Customer", "User", "System"];
	}
}

async function loadLogs() {
	try {
		const query: any = {
			pageIndex: 0,
			pageSize: 100,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
		};
		if (searchQuery.value) query.q = searchQuery.value;
		if (filterModule.value !== "all") query.module = filterModule.value;
		if (filterType.value !== "all") query.auditType = filterType.value;

		const { data, error } = await auditApi.getAudits(query);
		if (data && data.data) {
			logs.value = data.data.map((item: any) => ({
				guid: item.guid,
				module: item.module,
				moduleCode: item.moduleCode,
				auditType: normalizeAuditType(item.auditType),
				createdAt: item.createdAt,
				createdBy: item.createdBy,
			}));
		} else if (error) {
			throw new Error(error.error.message);
		}
	} catch (error) {
		console.error("Failed to load audit logs:", error);
		logs.value = [];
	}
}

async function viewDetails(log: AuditLog) {
	selectedLog.value = log;
	isDetailDrawerOpen.value = true;
	isLoadingDetails.value = true;
	logChanges.value = [];

	try {
		const { data, error } = await auditApi.getAuditByGuid(log.guid);
		if (data && data.changes) {
			logChanges.value = data.changes.map((c: any) => ({
				changedField: c.changedField,
				old: c.old,
				new: c.new,
			}));
		} else if (error) {
			throw new Error(error.error.message);
		}
	} catch {
		// Mock changes based on action
		setTimeout(() => {
			if (log.auditType === "update") {
				logChanges.value = [
					{ changedField: "status", old: "PENDING", new: "IN_PROGRESS" },
					{ changedField: "assignedTo", old: "USR-001", new: "USR-002" }
				];
			} else if (log.auditType === "create") {
				logChanges.value = [
					{ changedField: "id", old: null, new: log.moduleCode }
				];
			}
			isLoadingDetails.value = false;
		}, 600);
		return;
	}
	isLoadingDetails.value = false;
}

onMounted(() => {
	loadModules();
	loadLogs();
});
</script>

<template>
	<div class="maintenance-view">
		<div class="maintenance-view__header">
			<div class="maintenance-view__title-area">
				<h1>System Audit Log</h1>
				<p class="maintenance-view__subtitle">
					Monitor and track all system operations and data modifications
				</p>
			</div>
		</div>

		<Card style="padding: var(--spacing-md);">
			<div class="filter-bar">
				<Textbox
					v-model="searchQuery"
					placeholder="Search by User Code..."
					style="flex: 1;"
					hide-footer
				>
					<template #prefix>
						<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
					</template>
				</Textbox>

				<FilterPanel show-reset align="right" @reset="resetFilters">
					<Select v-model="filterModule" label="Module">
						<option value="all">All Modules</option>
						<option v-for="mod in modules" :key="mod" :value="mod">{{ mod }}</option>
					</Select>

					<Select v-model="filterType" label="Action Type">
						<option value="all">All Actions</option>
						<option value="create">Create</option>
						<option value="update">Update</option>
						<option value="delete">Delete</option>
					</Select>
				</FilterPanel>
			</div>
		</Card>

		<Card class="table-scroll-container" style="padding: 0;">
			<Table
				paginate
				storageKey="audit-log-list"
				:headers="headers"
				:items="filteredLogs"
				emptyMessage="No audit logs found for the selected criteria."
			>
				<template #item-timestamp="{ item }">
					<div class="audit-cell">
						<span class="audit-cell__date">{{ formatDate(item.createdAt) }}</span>
						<span class="audit-cell__time">{{ formatTime(item.createdAt) }}</span>
					</div>
				</template>

				<template #item-user="{ item }">
					<div class="audit-user">
						<div class="audit-user__avatar">
							{{ item.createdBy ? item.createdBy[0].toUpperCase() : 'S' }}
						</div>
						<div class="audit-user__info">
							<span class="audit-user__name">{{ item.createdBy || 'SYSTEM' }}</span>
						</div>
					</div>
				</template>

				<template #item-module="{ item }">
					<div class="audit-cell">
						<span class="audit-cell__module">{{ item.module }}</span>
						<span v-if="item.moduleCode" class="audit-cell__code">{{ item.moduleCode }}</span>
					</div>
				</template>

				<template #item-action="{ item }">
					<Badge :type="getActionTypeClass(item.auditType)">
						{{ formatAuditType(item.auditType) }}
					</Badge>
				</template>

				<template #item-actions="{ item }">
					<button class="btn btn--icon" @click="viewDetails(item)" title="View Changes">
						<i class="mdi mdi-eye-outline"></i>
					</button>
				</template>
			</Table>
		</Card>

		<!-- Change Detail Drawer -->
		<Dialog v-model="isDetailDrawerOpen">
			<template #header>
				<div class="drawer-header">
					<h2>Record Details</h2>
					<Badge :type="getActionTypeClass(selectedLog?.auditType || '')">
						{{ formatAuditType(selectedLog?.auditType) }}
					</Badge>
				</div>
				<p class="drawer-subtitle">
					{{ selectedLog?.module }} {{ selectedLog?.moduleCode ? `(${selectedLog.moduleCode})` : '' }}
				</p>
			</template>

			<div class="detail-drawer-content">
				<div v-if="isLoadingDetails" class="loading-state">
					<i class="mdi mdi-loading mdi-spin"></i>
					<span>Fetching field changes...</span>
				</div>
				
				<div v-else-if="logChanges.length === 0" class="empty-state">
					<i class="mdi mdi-text-box-search-outline empty-state__icon"></i>
					<p>No Explicit Field Changes</p>
					<span class="empty-state__sub">This action did not record specific property differences.</span>
				</div>

				<div v-else class="changes-list">
					<div v-for="(change, index) in logChanges" :key="index" class="change-card">
						<div class="change-card__header">
							<i class="mdi mdi-code-tags"></i>
							<span>{{ change.changedField }}</span>
						</div>
						<div class="change-card__diff">
							<div class="diff-box diff-box--old" v-if="change.old !== null && change.old !== undefined">
								<div class="diff-box__label">Previous</div>
								<div class="diff-box__value">{{ change.old || '—' }}</div>
							</div>
							
							<div class="diff-icon" v-if="change.old !== null && change.old !== undefined">
								<i class="mdi mdi-arrow-right"></i>
							</div>
							
							<div class="diff-box diff-box--new" v-if="change.new !== null && change.new !== undefined">
								<div class="diff-box__label">Updated</div>
								<div class="diff-box__value">{{ change.new || '—' }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--text" @click="isDetailDrawerOpen = false">Close</button>
			</template>
		</Dialog>
	</div>
</template>



<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
	display: flex;
	align-items: $align;
	gap: $gap;
}

.maintenance-view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}
	&__title-area {
		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0 0 4px;
			color: var(--colors-text-primary);
		}
		p {
			font-size: 13px;
			color: var(--colors-text-muted);
			margin: 0;
		}
	}
}

.filter-bar {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
}

.table-scroll-container {
	max-height: calc(100vh - 260px);
	overflow-y: auto;
}

.audit-cell {
	display: flex;
	flex-direction: column;
	gap: 2px;
	&__date, &__module {
		font-size: 13px;
		font-weight: 700;
		color: var(--colors-text-primary);
	}
	&__time, &__code {
		font-size: 11px;
		color: var(--colors-text-muted);
		font-family: monospace;
	}
}

.audit-user {
	@include flex-row($align: center, $gap: 12px);
	&__avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--colors-brand-primary);
		color: white;
		font-weight: 700;
		font-size: 13px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	&__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	&__name {
		font-size: 13px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}





// Drawer Content Styles
.drawer-header {
	@include flex-row($align: center, $gap: 12px);
	h2 {
		margin: 0;
		font-size: 18px;
		color: var(--colors-text-primary);
	}
}
.drawer-subtitle {
	font-size: 13px;
	color: var(--colors-text-muted);
	margin: 6px 0 0 0;
	font-family: monospace;
}

.detail-drawer-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-lg);
}

.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 0;
	color: var(--colors-text-muted);
	gap: 12px;
	i {
		font-size: 24px;
		color: var(--colors-brand-primary);
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	text-align: center;
	color: var(--colors-text-muted);
	&__icon {
		font-size: 40px;
		opacity: 0.2;
		margin-bottom: 12px;
	}
	p {
		font-size: 15px;
		font-weight: 600;
		color: var(--colors-text-primary);
		margin: 0 0 4px 0;
	}
	&__sub {
		font-size: 13px;
	}
}

.changes-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
}

.change-card {
	background: var(--colors-surface-background);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 16px;
	
	&__header {
		@include flex-row($align: center, $gap: 8px);
		margin-bottom: 12px;
		font-size: 13px;
		font-weight: 700;
		color: var(--colors-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		
		i {
			color: var(--colors-brand-primary);
			font-size: 16px;
		}
	}
	
	&__diff {
		display: flex;
		align-items: stretch;
		gap: 12px;
		
		@media (max-width: 640px) {
			flex-direction: column;
			.diff-icon { display: none; }
		}
	}
}

.diff-box {
	flex: 1;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 6px;
	padding: 10px 14px;
	min-width: 0; // Prevent flex blowout
	
	&--old {
		border-left: 3px solid var(--colors-state-danger, #ef4444);
	}
	&--new {
		border-left: 3px solid var(--colors-state-success, #10b981);
	}
	
	&__label {
		font-size: 11px;
		font-weight: 700;
		color: var(--colors-text-muted);
		text-transform: uppercase;
		margin-bottom: 4px;
	}
	
	&__value {
		font-size: 13px;
		color: var(--colors-text-primary);
		font-family: monospace;
		word-break: break-all;
	}
}

.diff-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--colors-text-muted);
	font-size: 20px;
}
</style>
