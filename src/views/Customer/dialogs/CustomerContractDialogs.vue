<script setup lang="ts">
import Dialog from "@/components/Dialog.vue";
import Textbox from "@/components/Textbox.vue";
import DatePicker from "@/components/DatePicker.vue";

export interface ContractFormValue {
	contractNo: string;
	contractName: string;
	startDate: string;
	endDate: string;
	description: string;
}

export interface RenewFormValue {
	newEndDate: string;
	remarks: string;
}

withDefaults(
	defineProps<{
		isEditing: boolean;
		loading?: boolean;
		selectedContract?: { contractNo?: string; contractName?: string } | null;
		dateGridClass?: string;
		variant?: "form" | "profile";
	}>(),
	{
		loading: false,
		selectedContract: null,
		dateGridClass: "form-grid-2",
		variant: "form",
	},
);

const showContractDialog = defineModel<boolean>("showContractDialog", { required: true });
const showRenewDialog = defineModel<boolean>("showRenewDialog", { required: true });
const contractForm = defineModel<ContractFormValue>("contractForm", { required: true });
const renewForm = defineModel<RenewFormValue>("renewForm", { required: true });

defineEmits<{
	(e: "save-contract"): void;
	(e: "renew-contract"): void;
}>();
</script>

<template>
	<Dialog
		v-model="showContractDialog"
		:title="isEditing ? 'Edit Customer Contract' : 'Add New Customer Contract'"
		:confirmText="isEditing ? 'Save Edit' : 'Create Contract'"
		cancelText="Cancel"
		:loading="loading"
		overflowVisible
		@confirm="$emit('save-contract')"
	>
		<div class="dialog-form" :class="`dialog-form--${variant}`">
			<div class="form-group mb-md">
				<label class="form-group__label">Contract No <span class="u-required">*</span></label>
				<Textbox v-model="contractForm.contractNo" placeholder="e.g. CTR-2026-001" />
			</div>
			<div class="form-group mb-md">
				<label class="form-group__label">Contract Title / Name <span class="u-required">*</span></label>
				<Textbox v-model="contractForm.contractName" placeholder="e.g. Annual Maintenance Contract" />
			</div>
			<div :class="[dateGridClass, 'mb-md']">
				<div class="form-group">
					<label class="form-group__label">Start Date <span class="u-required">*</span></label>
					<DatePicker v-model="contractForm.startDate" />
				</div>
				<div class="form-group">
					<label class="form-group__label">End Date (Expiry) <span class="u-required">*</span></label>
					<DatePicker v-model="contractForm.endDate" />
				</div>
			</div>
			<Textbox
				label="Description / Remarks"
				v-model="contractForm.description"
				placeholder="Optional contract terms or notes..."
			/>
		</div>
	</Dialog>

	<Dialog
		v-model="showRenewDialog"
		title="Renew Contract"
		confirmText="Confirm Renewal"
		cancelText="Cancel"
		:loading="loading"
		overflowVisible
		@confirm="$emit('renew-contract')"
	>
		<div class="dialog-form" :class="`dialog-form--${variant}`" v-if="selectedContract">
			<p class="mb-md" style="font-size: 13px; color: var(--colors-text-muted)">
				Renewing contract
				<strong class="u-font-mono u-text-primary">{{ selectedContract.contractNo }}</strong>
				({{ selectedContract.contractName }})
			</p>
			<div class="form-group mb-md">
				<label class="form-group__label">New Expiration Date <span class="u-required">*</span></label>
				<DatePicker v-model="renewForm.newEndDate" />
			</div>
			<Textbox
				label="Renewal Remarks / Notes"
				v-model="renewForm.remarks"
				placeholder="Reason for extension / renewal terms..."
			/>
		</div>
	</Dialog>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Customer/_customer-contract-dialogs.scss";
</style>
