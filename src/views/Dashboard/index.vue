<template>
	<div class="dashboard">
		<div class="dashboard__header">
			<div class="dashboard__header-title">
				<h1>Dashboard</h1>
				<p class="dashboard__updated-time">Last updated: {{ lastUpdatedTime }}</p>
			</div>
			<button class="dashboard__refresh-btn" @click="refreshData">
				<i class="mdi mdi-refresh"></i>
			</button>
		</div>

		<div class="dashboard__cards-grid">
			<div
				v-for="item in statusCards"
				:key="item.title"
				class="status-card"
				:class="{ 'status-card--dark': isDarkMode }"
				:style="getCardStyle(item)"
			>
				<div class="status-card__body">
					<i
						class="mdi status-card__icon"
						:class="item.icon"
						:style="getIconStyle(item)"
					></i>
					<div class="status-card__content">
						<span class="status-card__number" :style="getNumberStyle(item)">{{
							item.count
						}}</span>
						<span class="status-card__title">{{ item.title }}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="dashboard__main-layout">
			<div class="dashboard__alert-zone">
				<div class="alert-box alert-box--error">
					<i class="mdi mdi-alert-circle-outline alert-box__icon"></i>
					<div class="alert-box__content">
						<strong>Attention:</strong> There are 3 high-priority work orders that have
						been pending for more than 48 hours.
					</div>
				</div>
			</div>

			<div class="dashboard__content-grid">
				<div class="dashboard__panel">
					<h2 class="dashboard__panel-title">Work by Type</h2>
					<div class="chart-container">
						<svg class="donut-chart" viewBox="0 0 42 42">
							<circle
								class="donut-hole"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
							></circle>
							<circle
								class="donut-ring"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="var(--colors-surface-border)"
								stroke-width="3"
							></circle>

							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#3B82F6"
								stroke-width="4"
								stroke-dasharray="25 75"
								stroke-dashoffset="25"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#F59E0B"
								stroke-width="4"
								stroke-dasharray="35 65"
								stroke-dashoffset="100"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#6366F1"
								stroke-width="4"
								stroke-dasharray="15 85"
								stroke-dashoffset="65"
							></circle>
							<circle
								class="donut-segment"
								cx="21"
								cy="21"
								r="15.915"
								fill="transparent"
								stroke="#06B6D4"
								stroke-width="4"
								stroke-dasharray="25 75"
								stroke-dashoffset="50"
							></circle>
						</svg>

						<div class="chart-legends">
							<div
								v-for="(label, index) in chartLabels"
								:key="label"
								class="legend-item"
							>
								<span
									class="legend-item__color"
									:style="{ backgroundColor: chartColors[index] }"
								></span>
								<span class="legend-item__text"
									>{{ label }} ({{ chartData[index] }}%)</span
								>
							</div>
						</div>
					</div>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">Recent Updates</h2>
						<button class="text-btn">
							View History <i class="mdi mdi-arrow-right"></i>
						</button>
					</div>

					<div class="timeline">
						<div
							v-for="activity in activities"
							:key="activity.woNumber"
							class="timeline-item"
						>
							<div
								class="timeline-item__badge"
								:style="{ backgroundColor: activity.color }"
							></div>
							<div class="timeline-item__card">
								<div class="timeline-item__header">
									<span class="timeline-item__title"
										><strong>{{ activity.woNumber }}</strong> -
										{{ activity.title }}</span
									>
									<span class="timeline-item__time">{{ activity.timeAgo }}</span>
								</div>
								<p class="timeline-item__desc">{{ activity.description }}</p>
							</div>
						</div>
					</div>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">My Recent Drafts</h2>
						<button class="text-btn">View All</button>
					</div>
					<table class="data-table">
						<thead>
							<tr>
								<th>WO #</th>
								<th>Title</th>
								<th class="u-text-right">Action</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="draft in drafts" :key="draft.woNumber">
								<td>{{ draft.woNumber }}</td>
								<td>{{ draft.title }}</td>
								<td class="u-text-right">
									<button class="icon-btn icon-btn--info">
										<i class="mdi mdi-pencil"></i>
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div class="dashboard__panel">
					<div class="dashboard__panel-header">
						<h2 class="dashboard__panel-title">Requires Attention</h2>
						<button class="text-btn">View All</button>
					</div>
					<table class="data-table">
						<thead>
							<tr>
								<th>WO #</th>
								<th>Status</th>
								<th class="u-text-right">Action</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="item in pendingActionItems" :key="item.woNumber">
								<td>{{ item.woNumber }}</td>
								<td>
									<span class="badge" :style="getBadgeStyle(item.statusColor)">{{
										item.status
									}}</span>
								</td>
								<td class="u-text-right">
									<button
										class="action-btn"
										:style="getBtnActionStyle(item.actionBtnColor)"
									>
										{{ item.actionText }}
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const isDarkMode = ref(false);

const lastUpdatedTime = ref("12 Jun 2026, 04:26 PM");

const chartData = [25, 35, 15, 25];
const chartLabels = ["Plumbing", "Electrical", "HVAC", "General"];
const chartColors = ["#3B82F6", "#F59E0B", "#6366F1", "#06B6D4"];

const statusCards = ref([
	{ title: "New", count: 8, icon: "mdi-plus-circle", baseColor: "#3B82F6" },
	{ title: "Pending Approval", count: 6, icon: "mdi-clock", baseColor: "#F59E0B" },
	{ title: "In Progress", count: 2, icon: "mdi-wrench", baseColor: "#6366F1" },
	{ title: "Done", count: 0, icon: "mdi-check-circle", baseColor: "#06B6D4" },
	{ title: "Completed", count: 2, icon: "mdi-assignment-turned-in", baseColor: "#10B981" },
	{ title: "Claimed", count: 1, icon: "mdi-credit-card", baseColor: "#14B8A6" },
	{ title: "Closed", count: 3, icon: "mdi-power", baseColor: "#64748B" },
	{ title: "Cancelled", count: 1, icon: "mdi-cancel", baseColor: "#EF4444" },
]);

const drafts = ref([
	{ woNumber: "WO-2026-0012", title: "Replace Air Filter" },
	{ woNumber: "WO-2026-0015", title: "Boiler Leak Inspection" },
]);

const pendingActionItems = ref([
	{
		woNumber: "WO-2026-0008",
		status: "Rejected",
		statusColor: "#EF4444",
		actionText: "Fix Draft",
		actionBtnColor: "#EF4444",
	},
	{
		woNumber: "WO-2026-0004",
		status: "Pending",
		statusColor: "#F59E0B",
		actionText: "Approve",
		actionBtnColor: "#3B82F6",
	},
]);

const activities = ref([
	{
		woNumber: "WO-8821",
		title: "Rejected",
		description: "Manager: 'Please re-upload the site photo, it's too blurry.'",
		timeAgo: "10 mins ago",
		color: "#EF4444",
	},
	{
		woNumber: "WO-8815",
		title: "Status Changed",
		description: "Moved to 'In Progress' by System",
		timeAgo: "1 hour ago",
		color: "#3B82F6",
	},
	{
		woNumber: "WO-8790",
		title: "Payment Claimed",
		description: "Your claim has been processed successfully.",
		timeAgo: "Yesterday",
		color: "#10B981",
	},
]);

function getCardStyle(item: any) {
	if (isDarkMode.value) {
		return {
			background: "linear-gradient(135deg, #1e1e2d 0%, #151521 100%)",
			borderLeft: `5px solid ${item.baseColor}`,
		};
	}
	return { backgroundColor: item.baseColor, color: "white" };
}

function getIconStyle(item: any) {
	if (isDarkMode.value) {
		return {
			color: item.baseColor,
			opacity: 0.25,
			filter: `drop-shadow(0 0 8px ${item.baseColor})`,
		};
	}
	return { color: "white", opacity: 0.35 };
}

function getNumberStyle(item: any) {
	if (isDarkMode.value) {
		return { color: item.baseColor, textShadow: `0 0 10px ${item.baseColor}50` };
	}
	return { color: "white" };
}

function getBadgeStyle(color: string) {
	return { color: color, border: `1px solid ${color}`, backgroundColor: `${color}10` };
}

function getBtnActionStyle(color: string) {
	return { color: color, border: `1px solid ${color}` };
}

function refreshData() {
	console.log("Refreshing dashboard data via...");
}
</script>

<style lang="scss" scoped>
.dashboard {
	padding: var(--spacing-xl);
	background-color: var(--colors-surface-background);
	min-height: 100vh;
	color: var(--colors-text-primary);

	&__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-xl);

		h1 {
			font-size: 24px;
			font-weight: 700;
			margin: 0 0 4px 0;
		}
	}

	&__updated-time {
		font-size: var(--typography-fontSize-xs);
		color: var(--colors-text-muted);
		margin: 0;
	}

	&__refresh-btn {
		background: transparent;
		border: none;
		color: var(--colors-brand-primary);
		font-size: 22px;
		cursor: pointer;
		padding: 8px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;

		&:hover {
			background: rgba(99, 102, 241, 0.08);
		}
	}

	&__cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
	}

	&__main-layout {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	&__content-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-lg);

		@media (max-width: 1024px) {
			grid-template-columns: 1fr;
		}
	}

	&__panel {
		background: white;
		border: 1px solid var(--colors-surface-border);
		border-radius: 12px;
		padding: var(--spacing-xl);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
		display: flex;
		flex-direction: column;

		&-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: var(--spacing-lg);
		}
	}

	&__panel-title {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}
}

.status-card {
	height: 110px;
	padding: var(--spacing-md) var(--spacing-lg);
	border-radius: 12px;
	position: relative;
	overflow: hidden;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	box-sizing: border-box;

	&__body {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 100%;
	}

	&__icon {
		position: absolute;
		left: -10px;
		bottom: -20px;
		font-size: 6rem;
		pointer-events: none;
	}

	&__content {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		width: 100%;
		z-index: 1;
	}

	&__number {
		font-size: 32px;
		font-weight: 800;
		line-height: 1;
	}

	&__title {
		font-size: 13px;
		font-weight: 600;
		margin-top: 6px;
		opacity: 0.9;
	}
}

.alert-box {
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: var(--spacing-md) var(--spacing-lg);
	border-radius: 8px;
	font-size: var(--typography-fontSize-sm);

	&--error {
		background-color: #fef2f2;
		border: 1px solid #fca5a5;
		color: #991b1b;
	}

	&__icon {
		font-size: 18px;
	}
}

.chart-container {
	display: flex;
	align-items: center;
	justify-content: space-around;
	gap: var(--spacing-md);
	padding: var(--spacing-md) 0;
	flex-grow: 1;

	.donut-chart {
		width: 150px;
		height: 150px;
		transform: rotate(-90deg);
	}

	.chart-legends {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;

		&__color {
			width: 10px;
			height: 10px;
			border-radius: 50%;
		}
	}
}

.timeline {
	display: flex;
	flex-direction: column;
	position: relative;
	padding-left: var(--spacing-lg);

	&::before {
		content: "";
		position: absolute;
		left: 5px;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background-color: var(--colors-surface-border);
	}

	&-item {
		display: flex;
		position: relative;
		margin-bottom: var(--spacing-md);

		&:last-child {
			margin-bottom: 0;
		}

		&__badge {
			position: absolute;
			left: -19px;
			top: 6px;
			width: 12px;
			height: 12px;
			border-radius: 50%;
			border: 2px solid white;
			z-index: 2;
		}

		&__card {
			background-color: #f8fafc;
			border-radius: 8px;
			padding: var(--spacing-md);
			width: 100%;
		}

		&__header {
			display: flex;
			justify-content: space-between;
			font-size: 13px;
			margin-bottom: 4px;
		}

		&__time {
			color: var(--colors-text-muted);
			font-size: 12px;
		}

		&__desc {
			margin: 0;
			font-size: 13px;
			color: var(--colors-text-secondary);
		}
	}
}

.data-table {
	width: 100%;
	border-collapse: collapse;
	font-size: 13px;

	th,
	td {
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
	}

	th {
		color: var(--colors-text-muted);
		border-bottom: 1px solid var(--colors-surface-border);
		font-weight: 600;
	}

	tr {
		border-bottom: 1px solid #f1f5f9;
		&:last-child {
			border-bottom: none;
		}
		&:hover {
			background-color: #f8fafc;
		}
	}
}

.text-btn {
	background: transparent;
	border: none;
	color: var(--colors-brand-primary);
	font-size: 12px;
	font-weight: 600;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 4px;
}

.icon-btn {
	border: none;
	background: transparent;
	cursor: pointer;
	font-size: 16px;
	padding: 4px;
	border-radius: 4px;

	&--info {
		color: #0284c7;
	}
}

.action-btn {
	background: transparent;
	padding: 2px 10px;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 500;
	cursor: pointer;
}

.badge {
	padding: 2px 8px;
	border-radius: 12px;
	font-size: 11px;
	font-weight: 600;
}

.u-text-right {
	text-align: right !important;
}
</style>
