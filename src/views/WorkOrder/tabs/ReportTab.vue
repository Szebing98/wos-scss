<script setup lang="ts">
import Button from "@/components/Button.vue";

const props = defineProps<{
	workOrder: any;
	reportType: string;
	partsReplaced: any[];
	images: any[];
}>();

const emit = defineEmits(["updateReportType", "print"]);

function formatDateString(dateStr: string) {
	if (!dateStr) return "—";
	try {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return dateStr;
	}
}
</script>

<template>
	<div
		class="card-header no-print"
		style="
			display: flex;
			justify-content: space-between;
			align-items: center;
		"
	>
		<div style="display: flex; align-items: center; gap: 16px">
			<h3>Work Order Report</h3>
			<select
				:value="reportType"
				@change="emit('updateReportType', ($event.target as HTMLSelectElement).value)"
				style="
					padding: 8px 12px;
					border-radius: 6px;
					border: 1px solid var(--colors-border);
					background-color: var(--colors-bg-card);
					color: var(--colors-text-primary);
					font-size: 14px;
					font-weight: 500;
					width: 220px;
				"
			>
				<option value="general">General Report</option>
				<option value="mechanical">Mechanical Report</option>
				<option value="piping">Pipework Report (No Header)</option>
				<option value="piping_header">Pipework Report (With Header)</option>
			</select>
		</div>
		<Button variant="outlined" @click="emit('print')">
			<i class="mdi mdi-printer" style="margin-right: 6px"></i> Print Report
		</Button>
	</div>

	<div class="report-document">
		<div class="report-table">
			<!-- GS-TECH Header (Visible for Mechanical, General, and Piping With Header) -->
			<div class="rt-row" v-if="reportType !== 'piping'">
				<div class="rt-logo">
					<img src="@/assets/logo.svg" alt="GS-TECH" />
				</div>
				<div class="rt-company-info">
					<strong style="font-size: 13px">GS-TECH Engineering Sdn. Bhd (853477-A)</strong><br />
					1009, Jalan 7, Demak Laut Industrial Park, 93050 Kuching,<br />
					Sarawak. Tel: 082-439863; Fax: 082- 439862<br />
					Email:
					<a href="mailto:kch@gstech.com.my" style="color: #0ea5e9; text-decoration: none"
						>kch@gstech.com.my</a
					>; Website: www.gstech.com.my
				</div>
				<div class="rt-label">WORK ORDER:</div>
				<div class="rt-value">{{ workOrder.woNumber }}</div>
			</div>

			<!-- Common details grid -->
			<div class="rt-row">
				<div class="rt-label">CUSTOMER NAME:</div>
				<div class="rt-value" colspan="3">
					{{ workOrder.customer?.name }}
				</div>
				<div class="rt-label" v-if="reportType === 'piping'">WORK ORDER:</div>
				<div class="rt-value" v-if="reportType === 'piping'">
					{{ workOrder.woNumber }}
				</div>
			</div>

			<div class="rt-row">
				<div class="rt-label">REPORT TYPE:</div>
				<div class="rt-value">
					{{ workOrder.workTypeItem || "Work Type Item" }}
				</div>
				<div class="rt-label">CUS REF NO:</div>
				<div class="rt-value">{{ workOrder.cusRefNo || "—" }}</div>
			</div>

			<div class="rt-row" v-if="reportType === 'mechanical'">
				<div class="rt-label">EQUIPMENT NAME:</div>
				<div class="rt-value">
					{{ workOrder.equipment?.name || "—" }}
				</div>
				<div class="rt-label">BRAND/MODEL:</div>
				<div class="rt-value">
					{{ workOrder.equipment?.brand || "" }}
					{{ workOrder.equipment?.model || "" }}
				</div>
			</div>

			<div class="rt-row">
				<div class="rt-label">LOCATION:</div>
				<div class="rt-value" style="width: 85%">
					{{ workOrder.location }}
				</div>
			</div>

			<div class="rt-row">
				<div class="rt-label">START DATE:</div>
				<div class="rt-value">
					{{ formatDateString(workOrder.startDate) }}
				</div>
				<div class="rt-label">COMPLETE DATE:</div>
				<div class="rt-value">
					{{ formatDateString(workOrder.completedDate || workOrder.estimatedEndDate) }}
				</div>
			</div>

			<!-- Mechanical Special: General Information & Technical Data -->
			<template v-if="reportType === 'mechanical'">
				<div class="rt-header">GENERAL INFORMATION</div>
				<div class="rt-row">
					<div class="rt-label">EQUIPMENT TYPE:</div>
					<div class="rt-value">
						{{ workOrder.equipment?.equipmentType || "—" }}
					</div>
					<div class="rt-label">SERIAL NO:</div>
					<div class="rt-value">
						{{ workOrder.equipment?.serialNo || "—" }}
					</div>
				</div>

				<div class="rt-header">TECHNICAL & ELECTRICAL DATA</div>
				<div class="rt-content" style="padding: 0">
					<table style="width: 100%; border-collapse: collapse; border: none">
						<tr>
							<th
								style="
									width: 25%;
									text-align: left;
									background: #f3f4f6;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								Flow & Head
							</th>
							<td
								style="
									width: 25%;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								{{ workOrder.technical?.flowHead || workOrder.equipment?.flowHead || "—" }}
							</td>
							<th
								style="
									width: 25%;
									text-align: left;
									background: #f3f4f6;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								Rated Voltage
							</th>
							<td
								style="
									width: 25%;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								{{ workOrder.technical?.ratedVoltage || workOrder.equipment?.ratedVoltage || "—" }}
							</td>
						</tr>
						<tr>
							<th
								style="
									text-align: left;
									background: #f3f4f6;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								Rated Speed
							</th>
							<td
								style="
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								{{ workOrder.technical?.ratedSpeed || workOrder.equipment?.ratedSpeed || "—" }}
							</td>
							<th
								style="
									text-align: left;
									background: #f3f4f6;
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								Rated Current
							</th>
							<td
								style="
									padding: 6px;
									border: 1px solid var(--colors-border);
								"
							>
								{{ workOrder.technical?.ratedCurrent || workOrder.equipment?.ratedCurrent || "—" }}
							</td>
						</tr>
					</table>
				</div>
			</template>

			<div class="rt-header">WORK DESCRIPTION</div>
			<div class="rt-content work-desc-content" style="min-height: 180px">
				{{ workOrder.description }}
			</div>

			<!-- Mechanical Special: Parts Replaced -->
			<template v-if="reportType === 'mechanical' && partsReplaced.length > 0">
				<div class="rt-header">PARTS REPLACED/REPAIRED</div>
				<div class="rt-content">
					<ul style="margin: 0; padding-left: 20px">
						<li v-for="part in partsReplaced" :key="part.id">
							<strong>{{ part.name }}</strong> ({{ part.code }}) - Qty: {{ part.quantity }}
						</li>
					</ul>
				</div>
			</template>

			<div class="rt-header">REMARK(S)</div>
			<div class="rt-content" style="min-height: 80px">
				{{ workOrder.remarks || "—" }}
			</div>

			<div class="rt-header">WORK PROGRESS PHOTO(S)</div>
			<div class="rt-content">
				<div class="report-photos">
					<div
						class="photo-category"
						v-for="cat in ['Before', 'In Progress', 'After']"
						:key="cat"
					>
						<strong>{{ cat.toUpperCase() }}:</strong>
						<div class="photo-row">
							<img
								v-for="img in images.filter((i: any) => i.category === cat)"
								:key="img.id"
								:src="img.url"
								class="report-img"
								:alt="img.name"
							/>
							<span
								v-if="images.filter((i: any) => i.category === cat).length === 0"
								class="text-muted"
								style="font-size: 12px; margin-left: 8px"
								>No photos</span
							>
						</div>
					</div>
				</div>
			</div>

			<div class="rt-row signature-row">
				<div class="rt-label">CREATED BY:</div>
				<div class="rt-value">
					{{ workOrder.createdBy || "Engineer" }}
				</div>
				<div class="rt-label">DONE BY:</div>
				<div class="rt-value">
					{{ workOrder.assistantEngineers?.join(", ") || "Technicians" }}
				</div>
				<div class="rt-label">CHECKED BY:</div>
				<div class="rt-value">
					{{ workOrder.leadEngineerName || "Lead Engineer" }}
				</div>
				<div class="rt-label">VERIFIED BY:</div>
				<div class="rt-value">
					{{ workOrder.projectPicName || "PIC" }}
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
/* Printable Report */
.report-document {
	background: white;
	padding: 24px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	color: #000;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 13px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	margin-top: 16px;
}

.report-table {
	border: 1px solid #999;
	display: flex;
	flex-direction: column;
}

.rt-row {
	display: flex;
	border-bottom: 1px solid #999;
}
.rt-row:last-child {
	border-bottom: none;
}

.rt-label {
	flex: 0 0 15%;
	box-sizing: border-box;
	background: #e5e7eb;
	font-weight: bold;
	padding: 6px 8px;
	border-right: 1px solid #999;
	text-align: right;
	text-transform: uppercase;
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.rt-value {
	flex: 0 0 35%;
	box-sizing: border-box;
	padding: 6px 8px;
	border-right: 1px solid #999;
	display: flex;
	align-items: center;
}
.rt-value:last-child {
	border-right: none;
}

.rt-header {
	background: #e5e7eb;
	font-weight: bold;
	text-align: center;
	padding: 6px;
	border-bottom: 1px solid #999;
	text-transform: uppercase;
}

.rt-logo {
	flex: 0 0 15%;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	border-right: 1px solid #999;
	padding: 10px;
}
.rt-logo img {
	max-height: 50px;
	max-width: 100%;
}

.rt-company-info {
	flex: 0 0 35%;
	box-sizing: border-box;
	padding: 10px;
	border-right: 1px solid #999;
	font-size: 11px;
	line-height: 1.3;
}

.rt-content {
	padding: 8px 12px;
	border-bottom: 1px solid #999;
	line-height: 1.4;
}
.rt-content:last-child {
	border-bottom: none;
}

.report-photos {
	display: flex;
	flex-direction: column;
	gap: 24px;
}
.photo-category strong {
	display: block;
	margin-bottom: 6px;
	font-size: 13px;
	text-transform: uppercase;
}
.photo-row {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	min-height: 140px;
}
.report-img {
	width: calc(25% - 9px);
	height: 140px;
	object-fit: cover;
	border: 1px solid #ccc;
}

.signature-row {
	background: #f3f4f6;
}
.signature-row .rt-label {
	width: auto;
	background: transparent;
	padding: 8px;
	justify-content: flex-end;
}
.signature-row .rt-value {
	flex: 1;
	font-weight: normal;
}

@media print {
	:global(.header),
	:global(.side-menu),
	:global(.app-footer) {
		display: none !important;
	}
	:global(.app-main),
	:global(.app-container) {
		margin: 0 !important;
		padding: 0 !important;
		overflow: visible !important;
	}
	:global(.card),
	:global(.content-card),
	:global(.panel-card) {
		border: none !important;
		box-shadow: none !important;
		border-radius: 0 !important;
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
	}
	.page-header,
	.tabs-horizontal,
	.header-actions,
	.stepper-horizontal,
	.no-print,
	.finance-summary-box,
	.payment-section,
	.alert-box {
		display: none !important;
	}
	.wo-detail-page {
		margin: 0 !important;
		padding: 0 !important;
		background: white !important;
	}
	.workspace-area {
		padding: 0 !important;
		max-width: 100% !important;
	}
	.report-document {
		border: none !important;
		box-shadow: none !important;
		outline: none !important;
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
		page-break-inside: avoid;
	}
	.report-table {
		border: 1px solid #000 !important;
		font-size: 11px !important;
	}
	.rt-row,
	.rt-header,
	.rt-content,
	.rt-label,
	.rt-value,
	.rt-logo,
	.rt-company-info {
		border-color: #000 !important;
	}
	.rt-label,
	.rt-header {
		background-color: #e5e7eb !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		padding: 4px !important;
	}
	.rt-value {
		padding: 4px !important;
	}
	.rt-content {
		padding: 6px !important;
	}
	.photo-row {
		min-height: 95px !important;
	}
	.report-photos {
		gap: 8px !important;
	}
	.report-img {
		height: 95px !important;
	}
	.signature-row {
		background-color: #f3f4f6 !important;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
	.work-desc-content {
		min-height: 80px !important;
	}
	@page {
		size: A4 portrait;
		margin: 5mm;
	}
	body {
		background: white;
	}
}
</style>
