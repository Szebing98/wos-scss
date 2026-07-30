<script setup lang="ts">
import { computed } from "vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import MultiSelect from "@/components/MultiSelect.vue";
import DatePicker from "@/components/DatePicker.vue";
import Badge from "@/components/Badge.vue";
import Button from "@/components/Button.vue";
import Autocomplete from "@/components/Autocomplete.vue";

const props = defineProps<{
	workOrder: any;
	users: any[];
	workTypes: any[];
	isEditing: boolean;
	contractStatus: string | null;
	siteInstructionsFiles: any[];
	phases: any[];
	showEquipmentForm: boolean;
	isMechanical: boolean;
}>();

const emit = defineEmits(["save", "extend", "openMap"]);

const priorityColors: Record<string, string> = {
	High: "error",
	Medium: "warning",
	Low: "info",
};

const jobPriorityOptions = ["High", "Medium", "Low"];

function userDisplay(user: any) {
	const name = user?.name?.trim();
	const displayCode = user?.displayCode?.trim();
	if (name && displayCode) return `${name} (${displayCode})`;
	return name || displayCode || user?.code || "—";
}

const salesAgentUsers = computed(() => {
	return props.users.filter((u: any) => {
		const code = (u.displayCode || u.code || "").toUpperCase();
		const r = (u.role || u.userGroup || "").toLowerCase();
		return (
			(code.startsWith("SAL") || !code.startsWith("SA") || r.includes("sales")) &&
			!code.startsWith("ADM") &&
			!code.startsWith("MNG") &&
			!code.startsWith("ENG")
		);
	});
});

const projectPicUsers = computed(() => {
	return props.users.filter((u: any) => {
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
	return engineerUsers.value.filter(
		(u: any) =>
			u.code !== props.workOrder.leaderIICode &&
			!props.workOrder.technicianCodes?.includes(u.code),
	);
});

const leaderIIOptions = computed(() => {
	return engineerUsers.value.filter(
		(u: any) =>
			u.code !== props.workOrder.leaderCode &&
			!props.workOrder.technicianCodes?.includes(u.code),
	);
});

const technicianOptions = computed(() => {
	return engineerUsers.value
		.filter(
			(u: any) =>
				u.code !== props.workOrder.leaderCode && u.code !== props.workOrder.leaderIICode,
		)
		.map((u: any) => ({ ...u, name: userDisplay(u) }));
});
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
			<Button
				v-if="isEditing"
				variant="primary"
				@click="emit('save')"
				style="display: flex; align-items: center; gap: 4px"
			>
				<i class="mdi mdi-content-save"></i> Save Changes
			</Button>
		</div>
		<p class="text-muted">
			View and manage work order information, assignment schedules, and execution resources.
		</p>
	</div>

	<div class="form-grid">
		<div class="col-12"><h4 class="section-title">General Information</h4></div>

		<!-- Row 1: Job Priority + Work Type Item -->
		<div class="col-6">
			<Select v-model="workOrder.jobPriority" label="Job Priority" :disabled="!isEditing">
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
				placeholder="Search or select Project Person In Charge..."
				:disabled="!isEditing"
			>
				<template #label>
					Project PIC
					<i
						class="mdi mdi-information text-primary"
						style="margin-left: 4px; font-size: 14px"
						title="This is the primary point of contact for this work order"
					></i>
				</template>
			</Autocomplete>
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
			<div style="display: flex; gap: 8px; align-items: flex-end">
				<DatePicker
					v-model="workOrder.estimatedEndDate"
					label="Estimated Date of Completion *"
					:enableTime="false"
					:disabled="!isEditing"
					style="flex-grow: 1"
				/>
				<Button
					v-if="isEditing"
					variant="outlined"
					style="
						padding: 10px 14px;
						height: 42px;
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
					<button
						class="btn-icon-map"
						@click="emit('openMap')"
						title="View Map"
					>
						<i class="mdi mdi-map-marker"></i>
					</button>
				</template>
			</Textbox>
		</div>
		<div class="col-6">
			<label class="custom-label">Site Code</label>
			<div
				class="read-only-val"
				style="
					height: 42px;
					display: flex;
					align-items: center;
					padding-left: 12px;
					border: 1px solid var(--colors-surface-border);
					border-radius: 6px;
					background-color: var(--colors-surface-background);
				"
			>
				<i
					class="mdi mdi-map-marker-radius"
					style="margin-right: 4px; color: var(--colors-brand-primary)"
				></i>
				{{ workOrder.siteCode || "—" }}
			</div>
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
			<label class="custom-label">Work Description *</label>
			<textarea
				v-model="workOrder.description"
				class="custom-textarea"
				placeholder="Enter Description"
				rows="4"
				:disabled="!isEditing"
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
						style="
							width: 40px;
							height: 40px;
							display: flex;
							align-items: center;
							justify-content: center;
							background: var(--colors-bg-hover);
							border-radius: 4px;
							overflow: hidden;
							flex-shrink: 0;
						"
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
							>{{ file.name }}</a
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Customer & Contract (Read-Only) -->
		<div class="col-12">
			<h4 class="section-title" style="margin-top: 16px">Customer & Contract (Read-Only)</h4>
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
				<h4 class="section-title" style="margin-top: 16px">
					Equipment Information (Read-Only)
				</h4>
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
				<h4 class="section-title" style="margin-top: 16px">
					Mechanical Information (Read-Only)
				</h4>
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
</template>

<style scoped lang="scss">
.form-grid {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 20px;
	.col-12 {
		grid-column: span 12;
	}
	.col-6 {
		grid-column: span 6;
	}
	.col-4 {
		grid-column: span 4;
	}
}
.section-title {
	margin: 0;
	font-size: 16px;
	color: var(--colors-text-primary);
	border-bottom: 1px solid var(--colors-surface-border);
	padding-bottom: 8px;
}
.custom-label {
	display: block;
	font-size: 11px;
	font-weight: 600;
	color: var(--colors-text-secondary);
	text-transform: uppercase;
	margin-bottom: 4px;
}
.read-only-val {
	font-size: 14px;
	color: var(--colors-text-primary);
	padding: 8px 0;
	font-weight: 500;
}
.checkbox-list {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
	padding: 12px;
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	background: var(--colors-surface-background);
}
.checkbox-list-item {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 13px;
	&.is-disabled {
		opacity: 0.6;
		pointer-events: none;
	}
}
.btn-icon-map {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--colors-text-muted);
	font-size: 18px;
	padding: 4px 8px;
	transition: color 0.2s;
	&:hover {
		color: var(--colors-brand-primary);
	}
	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}
.map-container {
	width: 100%;
	height: 300px;
	background: var(--colors-surface-background);
	border: 2px dashed var(--colors-surface-border);
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: var(--colors-text-muted);
	i {
		font-size: 48px;
		color: var(--colors-text-secondary);
		margin-bottom: 8px;
	}
	span {
		font-weight: 500;
		font-size: 16px;
	}
}
.custom-textarea {
	width: 100%;
	padding: 12px;
	border-radius: 8px;
	border: 1px solid var(--colors-surface-border);
	background: var(--colors-bg-card);
	color: var(--colors-text-primary);
	font-size: 14px;
	outline: none;
	resize: vertical;
	font-family: inherit;
	&:focus {
		border-color: var(--colors-brand-primary);
	}
	&:disabled {
		background: var(--colors-surface-background);
		opacity: 0.7;
	}
}
.extended-count-badge {
	margin-top: 6px;
	font-size: 12px;
	color: var(--colors-brand-primary);
	display: flex;
	align-items: center;
	gap: 4px;
}
.file-list {
	display: flex;
	gap: 12px;
	margin-top: 8px;
	flex-wrap: wrap;
}
.file-item {
	border: 1px solid var(--colors-surface-border);
	padding: 8px;
	border-radius: 6px;
	display: flex;
	align-items: center;
	gap: 8px;
	background: var(--colors-surface-background);
	width: fit-content;
	min-width: 220px;
	&__preview {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--colors-bg-hover);
		border-radius: 4px;
		overflow: hidden;
		flex-shrink: 0;
		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
		i {
			font-size: 24px;
			color: var(--colors-text-muted);
		}
	}
	&__info {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	&__name {
		font-size: 13px;
		font-weight: 500;
		color: var(--colors-brand-primary);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 150px;
	}
}
.header-title-flex {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}
</style>
