<script setup lang="ts">
import { computed, ref } from "vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import DatePicker from "@/components/DatePicker.vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import Autocomplete from "@/components/Autocomplete.vue";
import { userDisplayCode } from "@/utils/User/user-display";

const props = defineProps<{
	workOrder: any;
	users: any[];
	workTypes: any[];
	isEditing: boolean;
	canEnterEdit: boolean;
	contractStatus: string | null;
	siteInstructionsFiles: any[];
	phases: any[];
	showEquipmentForm: boolean;
	isMechanical: boolean;
}>();

const emit = defineEmits(["save", "edit", "cancelEdit", "extend", "openMap"]);

const priorityColors: Record<string, string> = {
	High: "error",
	Medium: "warning",
	Low: "info",
};

const jobPriorityOptions = ["High", "Medium", "Low"];

const isPriorityEditable = computed(() => {
	return props.isEditing;
});

function userDisplay(user: any) {
	const visibleName = user?.name?.trim();
	const visibleCode = userDisplayCode(user?.displayCode, user?.code, "");
	if (visibleName && visibleCode) {
		if (visibleName.includes(`(${visibleCode})`) || visibleName === visibleCode) {
			return visibleName;
		}
		return `${visibleName} (${visibleCode})`;
	}
	return visibleName || visibleCode || "—";
}

const salesAgentUsers = computed(() => {
	const options = props.users.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("SAL") || !code.startsWith("SA") || r.includes("sales")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("MNG") &&
			!code.startsWith("ENG")
		);
	});
	if (
		props.workOrder.salesAgent &&
		!options.some((u: any) => u.code === props.workOrder.salesAgent)
	) {
		options.push({
			code: props.workOrder.salesAgent,
			displayCode: "",
			name: props.workOrder.salesAgentDisplay || props.workOrder.salesAgent,
		});
	}
	return options;
});

const projectPicUsers = computed(() => {
	const options = props.users.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("MNG") ||
				code.startsWith("MGR") ||
				code.startsWith("PM") ||
				r === "manager" ||
				r === "pm" ||
				r.includes("manager")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("SAL") &&
			!code.startsWith("ENG")
		);
	});
	if (
		props.workOrder.projectPersonInCharge &&
		!options.some((u: any) => u.code === props.workOrder.projectPersonInCharge)
	) {
		options.push({
			code: props.workOrder.projectPersonInCharge,
			displayCode: "",
			name:
				props.workOrder.projectPersonInChargeDisplay ||
				props.workOrder.projectPersonInCharge,
		});
	}
	return options;
});

const engineerUsers = computed(() => {
	return props.users.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("ENG") ||
				code.startsWith("TECH") ||
				r === "engineer" ||
				r === "eng" ||
				r.includes("engineer")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("SAL") &&
			!code.startsWith("MNG")
		);
	});
});

const leaderOptions = computed(() => {
	const options = engineerUsers.value.filter(
		(u: any) =>
			u.code !== props.workOrder.leaderIICode &&
			!props.workOrder.technicianCodes?.includes(u.code),
	);
	if (
		props.workOrder.leaderCode &&
		!options.some((u: any) => u.code === props.workOrder.leaderCode)
	) {
		options.push({
			code: props.workOrder.leaderCode,
			displayCode: "",
			name: props.workOrder.leaderDisplay || props.workOrder.leaderCode,
		});
	}
	return options;
});

const leaderIIOptions = computed(() => {
	const options = engineerUsers.value.filter(
		(u: any) =>
			u.code !== props.workOrder.leaderCode &&
			!props.workOrder.technicianCodes?.includes(u.code),
	);
	if (
		props.workOrder.leaderIICode &&
		!options.some((u: any) => u.code === props.workOrder.leaderIICode)
	) {
		options.push({
			code: props.workOrder.leaderIICode,
			displayCode: "",
			name: props.workOrder.leaderIIDisplay || props.workOrder.leaderIICode,
		});
	}
	return options;
});

const technicianOptions = computed(() => {
	const options = engineerUsers.value
		.filter(
			(u: any) =>
				u.code !== props.workOrder.leaderCode && u.code !== props.workOrder.leaderIICode,
		)
		.map((u: any) => ({ ...u, name: userDisplay(u) }));
	for (const code of props.workOrder.technicianCodes || []) {
		if (!options.some((u: any) => u.code === code)) {
			const technician = props.workOrder.technicians?.find((item: any) => item.code === code);
			options.push({
				code,
				displayCode: "",
				name: technician?.display || technician?.name || code,
			});
		}
	}
	return options;
});

const previewImageUrl = ref<string | null>(null);

function openImageModal(url: string) {
	previewImageUrl.value = url;
}
</script>

<template>
	<div class="card-header">
		<div
			class="header-title-flex"
			style="display: flex; align-items: center; justify-content: space-between; width: 100%"
		>
			<div style="display: flex; align-items: center; gap: 8px">
				<h3>Work Order Details</h3>
				<Badge type="primary" icon="mdi-tools">{{ workOrder.workType }}</Badge>
				<Badge
					v-if="workOrder.jobPriority"
					:type="priorityColors[workOrder.jobPriority] as any"
					:icon="
						workOrder.jobPriority === 'High'
							? 'mdi-alert-circle'
							: workOrder.jobPriority === 'Medium'
								? 'mdi-alert'
								: 'mdi-information'
					"
				>
					{{ workOrder.jobPriority }} Priority
				</Badge>
			</div>
			<div class="general-actions">
				<Button v-if="isEditing" variant="primary" @click="emit('save')">
					<i class="mdi mdi-content-save"></i> Save Changes
				</Button>
				<Button v-if="isEditing" variant="outlined" @click="emit('cancelEdit')">
					Cancel
				</Button>
				<Button v-else-if="canEnterEdit" variant="outlined" @click="emit('edit')">
					<i class="mdi mdi-pencil-outline"></i> Edit
				</Button>
			</div>
		</div>
		<p class="text-muted">
			View and manage work order information, assignment schedules, and execution resources.
		</p>
	</div>

	<div class="form-grid">
		<div class="col-12"><h4 class="section-title">General Information</h4></div>

		<!-- Row 1: Job Priority + Work Type Item -->
		<div class="col-6">
			<Select
				v-model="workOrder.jobPriority"
				label="Job Priority"
				:disabled="!isPriorityEditable"
			>
				<option v-for="priority in jobPriorityOptions" :key="priority" :value="priority">
					{{ priority }}
				</option>
			</Select>
		</div>
		<div class="col-6">
			<Select v-model="workOrder.workTypeItem" label="Work Type Item *" disabled>
				<option v-for="wt in workTypes" :key="wt.code" :value="wt.name">
					{{ wt.name }}
				</option>
			</Select>
		</div>
		<div class="col-12">
			<Textbox v-model="workOrder.title" label="Title *" disabled />
		</div>

		<!-- Row 2: Sales Agent + Person In Charge -->
		<div class="col-6">
			<Autocomplete
				v-model="workOrder.salesAgent"
				:options="
					salesAgentUsers.map((u) => ({
						id: u.code,
						name: userDisplay(u),
						code: u.displayCode || u.code,
					}))
				"
				:showCode="false"
				label="Sales Agent"
				placeholder="Search or select Sales Agent..."
				disabled
			/>
		</div>
		<div class="col-6">
			<Autocomplete
				v-model="workOrder.projectPersonInCharge"
				:options="
					projectPicUsers.map((u) => ({
						id: u.code,
						name: userDisplay(u),
						code: u.displayCode || u.code,
					}))
				"
				:showCode="false"
				label="Project PIC"
				placeholder="Search or select Project Person In Charge..."
				disabled
			/>
		</div>

		<!-- Row 3: Start Date + Estimated End Date -->
		<div class="col-6">
			<DatePicker
				v-model="workOrder.startDate"
				label="Start Date *"
				:enableTime="false"
				disabled
			/>
		</div>
		<div class="col-6">
			<div class="textbox-field">
				<label class="textbox-field__label">
					Estimated Date of Completion <span class="required-asterisk">*</span>
				</label>
				<div style="display: flex; gap: 8px; align-items: center">
					<DatePicker
						v-model="workOrder.estimatedEndDate"
						:enableTime="false"
						disabled
						hide-footer
						style="flex-grow: 1"
					/>
					<Button
						v-if="canEnterEdit"
						variant="outlined"
						style="
							padding: 10px 14px;
							height: 40px;
							display: flex;
							align-items: center;
							justify-content: center;
							gap: 4px;
						"
						@click="emit('extend')"
						title="Extend End Date"
					>
						<i class="mdi mdi-calendar-plus"></i> Extend
					</Button>
				</div>
			</div>
			<div
				class="extended-count-badge"
				v-if="workOrder?.extendedCount > 0"
				style="
					margin-top: 6px;
					font-size: 12px;
					color: var(--colors-brand-primary);
					display: flex;
					align-items: center;
					gap: 4px;
				"
			>
				<i class="mdi mdi-history"></i>
				Extended {{ workOrder.extendedCount }} times
			</div>
		</div>

		<!-- Execution Details -->
		<div class="col-12">
			<h4 class="section-title" style="margin-top: 16px">Execution Details</h4>
		</div>
		<div class="col-6">
			<Autocomplete
				v-model="workOrder.leaderCode"
				:options="
					leaderOptions.map((u) => ({
						id: u.code,
						name: userDisplay(u),
						code: u.displayCode || u.code,
					}))
				"
				:showCode="false"
				label="Leader"
				placeholder="Search or select Leader..."
				:disabled="!isEditing"
			/>
		</div>
		<div class="col-6">
			<Autocomplete
				v-model="workOrder.leaderIICode"
				:options="
					leaderIIOptions.map((u) => ({
						id: u.code,
						name: userDisplay(u),
						code: u.displayCode || u.code,
					}))
				"
				:showCode="false"
				label="Leader II"
				placeholder="Search or select Leader II..."
				:disabled="!isEditing"
			/>
		</div>
		<div class="col-6">
			<Textbox v-model="workOrder.location" label="Location" :disabled="!isEditing">
				<template #suffix>
					<button class="btn-icon-map" @click="emit('openMap')" title="View Map">
						<i class="mdi mdi-map-marker"></i>
					</button>
				</template>
			</Textbox>
		</div>
		<div class="col-6">
			<Textbox v-model="workOrder.siteCode" label="Site" disabled>
				<template #prefix>
					<i
						class="mdi mdi-map-marker-radius"
						style="
							margin-right: 4px;
							color: var(--colors-brand-primary);
							font-size: 18px;
						"
					></i>
				</template>
			</Textbox>
		</div>
		<div class="col-12">
			<MultiSelect
				v-model="workOrder.technicianCodes"
				:options="technicianOptions"
				:showCode="false"
				label="Technicians"
				placeholder="Search to add technicians..."
				:disabled="!isEditing"
			/>
		</div>

		<!-- Work Description -->
		<div class="col-12 textbox-field" style="margin-top: 8px">
			<label class="textbox-field__label">
				Work Description <span class="required-asterisk">*</span>
			</label>
			<textarea
				v-model="workOrder.description"
				class="custom-textarea"
				placeholder="Enter Description"
				rows="4"
				disabled
				style="
					width: 100%;
					border: 1px solid var(--colors-surface-border);
					border-radius: 6px;
					padding: 12px;
					outline: none;
					background-color: var(--colors-bg-card);
					color: var(--colors-text-primary);
					resize: vertical;
				"
			></textarea>
		</div>

		<!-- Site Instructions Attachments -->
		<div class="col-12" v-if="siteInstructionsFiles.length > 0">
			<h4 class="section-title" style="margin-top: 16px">Site Instructions</h4>
			<div
				class="file-list"
				style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap"
			>
				<div
					v-for="file in siteInstructionsFiles"
					:key="file.id"
					class="file-item"
					style="
						border: 1px solid var(--colors-surface-border);
						padding: 8px;
						border-radius: 6px;
						display: flex;
						align-items: center;
						gap: 8px;
						background: var(--colors-surface-background);
						width: fit-content;
						min-width: 220px;
					"
				>
					<div
						class="file-item__preview"
						:style="{
							width: '40px',
							height: '40px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							background: 'var(--colors-bg-hover)',
							borderRadius: '4px',
							overflow: 'hidden',
							flexShrink: 0,
							cursor: file.type?.startsWith('image/') ? 'pointer' : 'default',
						}"
						@click="file.type?.startsWith('image/') && openImageModal(file.url)"
					>
						<img
							v-if="file.type?.startsWith('image/')"
							:src="file.url"
							:alt="file.name"
							style="width: 100%; height: 100%; object-fit: cover"
						/>
						<i
							v-else
							class="mdi mdi-file-document-outline"
							style="font-size: 24px; color: var(--colors-text-muted)"
						></i>
					</div>
					<div
						class="file-item__info"
						style="
							display: flex;
							flex-direction: column;
							overflow: hidden;
							text-overflow: ellipsis;
							white-space: nowrap;
						"
					>
						<a
							v-if="file.type?.startsWith('image/')"
							href="javascript:void(0)"
							@click="openImageModal(file.url)"
							class="file-item__name"
							style="
								font-size: 13px;
								font-weight: 500;
								color: var(--colors-brand-primary);
								text-decoration: none;
								overflow: hidden;
								text-overflow: ellipsis;
								white-space: nowrap;
								max-width: 150px;
							"
						>
							{{ file.name }}
						</a>
						<a
							v-else
							:href="file.url"
							target="_blank"
							class="file-item__name"
							style="
								font-size: 13px;
								font-weight: 500;
								color: var(--colors-brand-primary);
								text-decoration: none;
								overflow: hidden;
								text-overflow: ellipsis;
								white-space: nowrap;
								max-width: 150px;
							"
						>
							{{ file.name }}
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Customer & Contract -->
		<div class="col-12">
			<h4 class="section-title" style="margin-top: 16px">Customer & Contract</h4>
		</div>
		<div class="col-4">
			<Textbox v-model="workOrder.customer.name" label="Customer Name" disabled />
		</div>
		<div class="col-4">
			<Textbox v-model="workOrder.customerPic" label="Customer PIC" disabled />
		</div>
		<div class="col-4">
			<Textbox v-model="workOrder.customerPicPhone" label="PIC Phone" disabled />
		</div>
		<div class="col-4">
			<Textbox v-model="workOrder.contractNo" label="Contract No." disabled>
				<template #suffix>
					<Badge v-if="contractStatus === 'Expired'" type="error" icon="mdi-alert-circle">
						Expired
					</Badge>
					<Badge
						v-else-if="contractStatus === 'ExpiringSoon'"
						type="warning"
						icon="mdi-clock-alert-outline"
					>
						Expiring
					</Badge>
				</template>
			</Textbox>
		</div>
		<div class="col-4">
			<DatePicker
				v-model="workOrder.contractStartDate"
				label="Contract Start"
				:enableTime="false"
				disabled
			/>
		</div>
		<div class="col-4">
			<DatePicker
				v-model="workOrder.contractEndDate"
				label="Contract End"
				:enableTime="false"
				disabled
			/>
		</div>

		<!-- Equipment Information -->
		<template v-if="showEquipmentForm">
			<div class="col-12">
				<h4 class="section-title" style="margin-top: 16px">Equipment Information</h4>
			</div>
			<div class="col-6">
				<Textbox v-model="workOrder.equipment.name" label="Equipment Name" disabled />
			</div>
			<div class="col-6">
				<Textbox
					v-model="workOrder.equipment.serialNo"
					label="Equipment Serial No"
					disabled
				/>
			</div>
			<div class="col-4">
				<Textbox v-model="workOrder.equipment.brand" label="Equipment Brand" disabled />
			</div>
			<div class="col-4">
				<Textbox v-model="workOrder.equipment.model" label="Equipment Model" disabled />
			</div>
			<div class="col-4">
				<Textbox
					v-model="workOrder.equipment.equipmentType"
					label="Equipment Type"
					disabled
				/>
			</div>
		</template>

		<!-- Mechanical Information -->
		<template v-if="isMechanical">
			<div class="col-12">
				<h4 class="section-title" style="margin-top: 16px">Mechanical Information</h4>
			</div>
			<div class="col-12">
				<Textbox v-model="workOrder.technical.flowHead" label="Flow & Head" disabled />
			</div>
			<div class="col-12" style="margin-top: 8px">
				<h5 style="margin: 0; font-size: 14px; font-weight: 600">Electrical Data</h5>
			</div>
			<div class="col-6">
				<Textbox v-model="workOrder.technical.brandName" label="Brand Name" disabled />
			</div>
			<div class="col-6">
				<Textbox v-model="workOrder.technical.serialNo" label="Serial No" disabled />
			</div>
			<div class="col-4">
				<Textbox
					v-model="workOrder.technical.ratedVoltage"
					label="Rated Voltage"
					disabled
				/>
			</div>
			<div class="col-4">
				<Textbox v-model="workOrder.technical.ratedSpeed" label="Rated Speed" disabled />
			</div>
			<div class="col-4">
				<Textbox
					v-model="workOrder.technical.ratedCurrent"
					label="Rated Current"
					disabled
				/>
			</div>
			<div class="col-4">
				<Textbox v-model="workOrder.technical.ratedPower" label="Rated Power" disabled />
			</div>
			<div class="col-4">
				<Select v-model="workOrder.technical.phase" label="Phase" disabled>
					<option value="">Select Phase</option>
					<option v-for="phase in phases" :key="phase.id" :value="phase.id">
						{{ phase.name }}
					</option>
				</Select>
			</div>
			<div class="col-4">
				<Textbox v-model="workOrder.technical.frameSize" label="Frame Size" disabled />
			</div>
		</template>
	</div>

	<!-- Image Lightbox Modal -->
	<div v-if="previewImageUrl" class="image-lightbox" @click="previewImageUrl = null">
		<div class="image-lightbox__content" @click.stop>
			<img :src="previewImageUrl" class="image-lightbox__img" />
			<button class="image-lightbox__close" @click="previewImageUrl = null">
				<i class="mdi mdi-close"></i>
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "@/styles/pages/WorkOrder/tabs/_general-tab.scss";
</style>
