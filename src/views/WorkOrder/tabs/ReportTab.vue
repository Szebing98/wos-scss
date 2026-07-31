<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import logo from "@/assets/logo.svg";

const props = defineProps<{
	workOrder: any;
	partReplacedImages: any[];
	images: any[];
}>();

const emit = defineEmits(["print"]);
const dateFormatStore = useDateFormatStore();

const showCompanyHeader = ref(true);

const reportKind = computed(() => {
	const workType =
		`${props.workOrder?.workType || ""} ${props.workOrder?.workTypeItem || ""}`.toLowerCase();
	if (workType.includes("pipe")) return "piping";
	if (workType.includes("mechanical") || workType.includes("maintenance")) return "mechanical";
	return "general";
});

watch(
	reportKind,
	(kind) => {
		showCompanyHeader.value = kind !== "piping";
	},
	{ immediate: true },
);

const reportTitle = computed(() => {
	if (reportKind.value === "mechanical") return "Mechanical Report";
	if (reportKind.value === "piping") return "Pipework Report";
	return "General Report";
});

const reportTypeLabel = computed(() => {
	if (reportKind.value === "mechanical") return "Mechanical";
	return props.workOrder?.workTypeItem || props.workOrder?.workType || "-";
});

const doneBy = computed(() => {
	const technicians = props.workOrder?.technicians;
	if (Array.isArray(technicians) && technicians.length) {
		return technicians
			.map((tech: any) => tech.display || tech.name || tech.code)
			.filter(Boolean)
			.join(", ");
	}
	const codes =
		props.workOrder?.technicianCodes || props.workOrder?.assistantEngineers || [];
	return Array.isArray(codes) && codes.length ? codes.join(", ") : "-";
});

function formatDateString(dateStr: string | Date | null) {
	if (!dateStr) return "";
	return dateFormatStore.formatDate(dateStr);
}

function display(value: unknown, fallback = "-") {
	if (value === null || value === undefined || value === "") return fallback;
	return String(value);
}

function photosFor(category: string) {
	const aliases: Record<string, string[]> = {
		before: ["before"],
		during: ["during", "in progress", "inprogress"],
		after: ["after"],
	};
	const normalized = category.toLowerCase();
	return props.images.filter((image: any) => {
		const imageCategory = String(image.subCategory || image.category || "")
			.toLowerCase()
			.trim();
		return (aliases[normalized] || [normalized]).includes(imageCategory);
	});
}
</script>

<template>
	<div class="report-toolbar no-print">
		<div class="report-toolbar__title">
			<h3>Work Order Report</h3>
			<span class="report-toolbar__badge">{{ reportTitle }}</span>
		</div>

		<div class="report-toolbar__actions">
			<button
				class="header-toggle"
				type="button"
				:class="{ 'header-toggle--active': showCompanyHeader }"
				@click="showCompanyHeader = !showCompanyHeader"
			>
				<span class="header-toggle__track">
					<span class="header-toggle__thumb" />
				</span>
				<span>Company Header</span>
			</button>

			<Button variant="outlined" @click="emit('print')">
				<i class="mdi mdi-printer" style="margin-right: 6px"></i> Print Report
			</Button>
		</div>
	</div>

	<div class="report-document" :class="`report-document--${reportKind}`">
		<table class="report-table">
			<tbody>
				<tr v-if="showCompanyHeader" class="company-row">
					<td class="logo-cell" colspan="2">
						<img :src="logo" alt="GS-TECH" />
					</td>
					<td class="company-cell" colspan="5">
						<strong>GS-TECH Engineering Sdn. Bhd (853477-A)</strong><br />
						1009, Jalan 7, Demak Laut Industrial Park, 93050 Kuching, Sarawak.<br />
						Tel: 082-439863; Fax: 082-439862<br />
						Email: <span class="report-blue">kch@gstech.com.my</span>; Website:
						www.gstech.com.my
					</td>
					<th colspan="2">WORK ORDER:</th>
					<td colspan="2">{{ display(workOrder.woNumber) }}</td>
				</tr>

				<template v-if="reportKind === 'mechanical'">
					<tr v-if="!showCompanyHeader">
						<th colspan="2">WORK ORDER:</th>
						<td colspan="9">{{ display(workOrder.woNumber) }}</td>
					</tr>
					<tr>
						<th colspan="2">REPORT TYPE:</th>
						<td colspan="2" class="report-blue">{{ reportTypeLabel }}</td>
						<th>TYPE:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.workTypeItem) }}
						</td>
						<th colspan="2">LOCATION:</th>
						<td colspan="2" class="report-blue">{{ display(workOrder.location) }}</td>
					</tr>
					<tr>
						<th colspan="2">CUSTOMER NAME:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.customer?.name) }}
						</td>
						<th colspan="2">CUST REF NO.:</th>
						<td colspan="2" class="report-blue">{{ display(workOrder.cusRefNo) }}</td>
					</tr>
					<tr>
						<th colspan="2">PROBLEM:</th>
						<td colspan="5" class="report-blue">{{ display(workOrder.title) }}</td>
						<th colspan="2">START DATE:</th>
						<td colspan="2">{{ formatDateString(workOrder.startDate) }}</td>
					</tr>
					<tr>
						<th colspan="2">EQUIPMENT NAME:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.equipment?.name) }}
						</td>
						<th colspan="2">COMPLETE DATE:</th>
						<td colspan="2">
							{{
								formatDateString(
									workOrder.completedDate || workOrder.estimatedEndDate,
								)
							}}
						</td>
					</tr>
					<tr>
						<th colspan="11" class="section-cell">GENERAL INFORMATION</th>
					</tr>
					<tr>
						<th colspan="2">EQUIPMENT TYPE:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.equipment?.equipmentType) }}
						</td>
						<th colspan="2">BRAND NAME:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.equipment?.brand) }}
						</td>
					</tr>
					<tr>
						<th colspan="2">MODEL:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.equipment?.model) }}
						</td>
						<th colspan="2">SERIAL NO.:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.equipment?.serialNo) }}
						</td>
					</tr>
					<tr>
						<th colspan="4" class="section-cell">TECHNICAL DATA</th>
						<th colspan="7" class="section-cell">ELECTRICAL DATA</th>
					</tr>
					<tr>
						<th colspan="2">FLOW&HEAD:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.technical?.flowHead) }}
						</td>
						<th colspan="2">BRAND NAME:</th>
						<td class="report-blue">{{ display(workOrder.technical?.brandName) }}</td>
						<th colspan="2">RATED VOLTAGE:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.technical?.ratedVoltage) }}
						</td>
					</tr>
					<tr>
						<th colspan="2">OTHERS:</th>
						<td colspan="2"></td>
						<th colspan="2">SERIAL NO.:</th>
						<td class="report-blue">{{ display(workOrder.technical?.serialNo) }}</td>
						<th colspan="2">RATED SPEED:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.technical?.ratedSpeed) }}
						</td>
					</tr>
					<tr>
						<td colspan="4"></td>
						<th colspan="2">FRAME SIZE:</th>
						<td class="report-blue">{{ display(workOrder.technical?.frameSize) }}</td>
						<th colspan="2">RATED CURRENT:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.technical?.ratedCurrent) }}
						</td>
					</tr>
					<tr>
						<td colspan="4"></td>
						<th colspan="2">PHASE:</th>
						<td class="report-blue">{{ display(workOrder.technical?.phase) }}</td>
						<th colspan="2">RATED POWER:</th>
						<td colspan="2" class="report-blue">
							{{ display(workOrder.technical?.ratedPower) }}
						</td>
					</tr>
					<tr>
						<th colspan="11" class="section-cell section-cell--left">
							DETAIL OF WORK:
						</th>
					</tr>
					<tr>
						<td colspan="11" class="large-cell report-blue">
							{{ display(workOrder.description, "") }}
						</td>
					</tr>
					<tr>
						<th colspan="11" class="section-cell">PARTS REPLACED/ REPAIR:</th>
					</tr>
					<tr>
						<td colspan="11" class="part-photo-cell">
							<div v-if="partReplacedImages.length" class="part-photo-grid">
								<figure
									v-for="img in partReplacedImages"
									:key="img.id || img.guid || img.url"
									class="part-photo"
								>
									<img :src="img.url" :alt="img.name || 'Part replaced'" />
									<figcaption v-if="img.name">{{ img.name }}</figcaption>
								</figure>
							</div>
							<span v-else class="photo-empty"
								>No part replaced photos uploaded.</span
							>
						</td>
					</tr>
				</template>

				<template v-else-if="reportKind === 'piping'">
					<tr v-if="!showCompanyHeader">
						<th colspan="2">CUSTOMER NAME:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.customer?.name) }}
						</td>
						<th colspan="2">WORK ORDER:</th>
						<td colspan="2">{{ display(workOrder.woNumber) }}</td>
					</tr>
					<tr v-else>
						<th colspan="2">CUSTOMER NAME:</th>
						<td colspan="9" class="report-blue">
							{{ display(workOrder.customer?.name) }}
						</td>
					</tr>
					<tr>
						<th colspan="2">REPORT TYPE:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.workTypeItem || workOrder.title) }}
						</td>
						<th colspan="2">CUST REF NO:</th>
						<td colspan="2" class="report-blue">{{ display(workOrder.cusRefNo) }}</td>
					</tr>
					<tr>
						<th colspan="2">LOCATION:</th>
						<td colspan="9" class="report-blue">{{ display(workOrder.location) }}</td>
					</tr>
					<tr>
						<th colspan="2">START DATE:</th>
						<td colspan="5">{{ formatDateString(workOrder.startDate) }}</td>
						<th colspan="2">COMPLETE DATE:</th>
						<td colspan="2">
							{{
								formatDateString(
									workOrder.completedDate || workOrder.estimatedEndDate,
								)
							}}
						</td>
					</tr>
					<tr>
						<th colspan="11" class="section-cell section-cell--left">
							WORK DESCRIPTION:
						</th>
					</tr>
					<tr>
						<td colspan="11" class="medium-cell report-blue">
							{{ display(workOrder.description, "") }}
						</td>
					</tr>
					<tr>
						<th colspan="2">REMARK(S):</th>
						<td colspan="9" class="remark-cell report-blue">
							{{ display(workOrder.remarks, "") }}
						</td>
					</tr>
				</template>

				<template v-else>
					<tr v-if="!showCompanyHeader">
						<th colspan="2">WORK ORDER:</th>
						<td colspan="9">{{ display(workOrder.woNumber) }}</td>
					</tr>
					<tr>
						<th colspan="2">CUSTOMER NAME:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.customer?.name) }}
						</td>
						<th colspan="2">CUSTOMER REF NO:</th>
						<td colspan="2" class="report-blue">{{ display(workOrder.cusRefNo) }}</td>
					</tr>
					<tr>
						<th colspan="2">REPORT TYPE:</th>
						<td colspan="5" class="report-blue">
							{{ display(workOrder.workTypeItem || workOrder.workType) }}
						</td>
						<th colspan="2">START DATE:</th>
						<td colspan="2" class="report-blue">
							{{ formatDateString(workOrder.startDate) }}
						</td>
					</tr>
					<tr>
						<th colspan="2">LOCATION:</th>
						<td colspan="5" class="report-blue">{{ display(workOrder.location) }}</td>
						<th colspan="2">COMPLETE DATE:</th>
						<td colspan="2" class="report-blue">
							{{
								formatDateString(
									workOrder.completedDate || workOrder.estimatedEndDate,
								)
							}}
						</td>
					</tr>
					<tr>
						<th colspan="2">WORK DESCRIPTION:</th>
						<td colspan="9" class="report-blue">
							{{ display(workOrder.description, "") }}
						</td>
					</tr>
					<tr>
						<th colspan="11" class="section-cell">DETAIL OF WORK:</th>
					</tr>
					<tr>
						<td colspan="11" class="large-cell"></td>
					</tr>
				</template>

				<tr>
					<th colspan="11" class="section-cell">WORK PROGRESS PHOTO(S):</th>
				</tr>
				<tr v-for="category in ['Before', 'During', 'After']" :key="category">
					<td colspan="11" class="photo-cell">
						<strong>{{ category.toUpperCase() }}:</strong>
						<div v-if="photosFor(category).length" class="photo-grid">
							<img
								v-for="img in photosFor(category)"
								:key="img.id || img.guid || img.url"
								:src="img.url"
								:alt="img.name || category"
							/>
						</div>
					</td>
				</tr>

				<tr class="signature-row">
					<th>{{ reportKind === "piping" ? "CREATED BY:" : "REPORTED BY:" }}</th>
					<td colspan="2" class="report-blue">
						{{
							display(
								workOrder.salesAgentDisplay ||
									workOrder.salesAgent ||
									workOrder.createdBy,
							)
						}}
					</td>
					<th>DONE BY:</th>
					<td class="report-blue">{{ doneBy }}</td>
					<th>{{ reportKind === "piping" ? "CHECKED BY:" : "QC MINGGU:" }}</th>
					<td colspan="2" class="report-blue">
						{{
							display(
								workOrder.leaderDisplay ||
									workOrder.leadEngineerDisplay ||
									workOrder.leaderCode ||
									workOrder.leadEngineer,
							)
						}}
					</td>
					<th>VERIFIED BY:</th>
					<td colspan="2" class="report-blue">
						{{
							display(
								workOrder.projectPersonInChargeDisplay ||
									workOrder.projectPersonInCharge,
							)
						}}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped lang="scss">
.report-toolbar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 16px;
}

.report-toolbar__title,
.report-toolbar__actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.report-toolbar__badge {
	border: 1px solid var(--colors-surface-border);
	border-radius: 6px;
	padding: 5px 10px;
	font-size: 13px;
	font-weight: 700;
	color: var(--colors-text-secondary);
	background: var(--colors-surface-background);
}

.header-toggle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 6px;
	background: var(--colors-surface-card);
	color: var(--colors-text-primary);
	font-size: 13px;
	font-weight: 700;
	padding: 8px 10px;
	cursor: pointer;
}

.header-toggle__track {
	width: 34px;
	height: 18px;
	border-radius: 99px;
	background: #cbd5e1;
	position: relative;
	transition: background 0.15s ease;
}

.header-toggle__thumb {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: #fff;
	position: absolute;
	top: 2px;
	left: 2px;
	transition: transform 0.15s ease;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.header-toggle--active .header-toggle__track {
	background: var(--colors-brand-primary);
}

.header-toggle--active .header-toggle__thumb {
	transform: translateX(16px);
}

.report-document {
	background: white;
	padding: 18px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	color: #111;
	font-family: Arial, Helvetica, sans-serif;
	font-size: 11px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	margin-top: 16px;
	overflow-x: auto;
}

.report-table {
	width: 190mm;
	min-height: 277mm;
	margin: 0 auto;
	border-collapse: collapse;
	table-layout: fixed;
	background: #fff;
}

.report-table th,
.report-table td {
	border: 1px solid #222;
	padding: 4px 7px;
	vertical-align: top;
	line-height: 1.25;
}

.report-table th {
	background: #d0cece;
	text-align: right;
	font-weight: 800;
	text-transform: uppercase;
}

.section-cell {
	background: #d0cece !important;
	text-align: center !important;
	font-weight: 800;
}

.section-cell--left {
	text-align: left !important;
}

.section-cell--light {
	background: #e5e5e5 !important;
	text-transform: none !important;
}

.logo-cell {
	text-align: center;
	vertical-align: middle !important;
}

.logo-cell img {
	width: 92px;
	max-width: 100%;
}

.company-cell {
	font-size: 10px;
	line-height: 1.25;
}

.company-cell strong {
	font-size: 13px;
}

.report-blue {
	color: #3f70d9;
}

.large-cell {
	height: 92px;
	white-space: pre-line;
}

.medium-cell {
	height: 76px;
	white-space: pre-line;
}

.remark-cell {
	height: 46px;
	white-space: pre-line;
}

.photo-cell {
	height: 150px;
	padding: 6px 7px !important;
}

.part-photo-cell {
	min-height: 140px;
	padding: 8px !important;
}

.part-photo-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 8px;
}

.part-photo {
	min-width: 0;
	margin: 0;
	break-inside: avoid;
}

.part-photo img {
	display: block;
	width: 100%;
	height: 90px;
	object-fit: contain;
	border: 1px solid #999;
	background: #fff;
}

.part-photo figcaption {
	margin-top: 3px;
	overflow: hidden;
	color: #444;
	font-size: 9px;
	text-align: center;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.photo-empty {
	color: #777;
	font-style: italic;
}

.report-document--piping .photo-cell,
.report-document--general .photo-cell {
	height: 195px;
}

.photo-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
	margin-top: 8px;
}

.photo-grid img {
	width: 100%;
	height: 115px;
	object-fit: cover;
	border: 1px solid #999;
}

.signature-row th,
.signature-row td {
	vertical-align: middle;
	height: 30px;
	font-size: 8.5px;
}

@media print {
	@page {
		size: A4 portrait;
		margin: 2mm;
	}

	.report-document {
		width: 140mm;
	}

	body * {
		visibility: hidden !important;
	}

	.photo-cell {
		height: auto;
	}

	.large-cell {
		height: auto;
	}

	.medium-cell {
		height: auto;
	}

	html,
	body,
	#app,
	main,
	.layout,
	.sidebar {
		position: static !important;
		margin: 0 !important;
		padding: 0 !important;
		width: 100% !important;
		height: auto !important;
		overflow: visible !important;
		background: transparent !important;
	}

	aside,
	nav,
	.sidebar,
	.no-print,
	.report-toolbar {
		display: none !important;
	}

	.report-document,
	.report-document * {
		visibility: visible !important;
	}

	.report-document {
		position: absolute !important;
		left: 0 !important;
		top: 0 !important;
		width: 100% !important;
		margin: 0 !important;
		padding: 0 !important;
		border: none !important;
		box-shadow: none !important;
	}
}
</style>
