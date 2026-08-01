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
@use "@/styles/pages/_work-order-tabs-report-tab.scss";
</style>
