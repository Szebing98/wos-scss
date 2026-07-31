<script setup lang="ts">
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const props = defineProps<{
	workOrder: any;
	isManager: boolean;
	currentUserRole: "Manager" | "Technician";
	currentStepIndex: number;
}>();

const emit = defineEmits(["updateRole", "approve", "reject"]);
const dateFormatStore = useDateFormatStore();

function formatDateString(dateStr: string) {
	return dateFormatStore.formatDate(dateStr);
}
</script>

<template>
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: center"
	>
		<div>
			<h3>Verification & Approval</h3>
			<p class="text-muted">
				Manager verification and approval of completed work. No signature upload required.
			</p>
		</div>
		<div class="role-selector">
			<label style="margin-right: 8px; font-size: 14px">Simulate Role:</label>
			<select
				:value="currentUserRole"
				@change="emit('updateRole', ($event.target as HTMLSelectElement).value)"
				style="
					padding: 4px 8px;
					border-radius: 4px;
					border: 1px solid var(--colors-surface-border);
				"
			>
				<option value="Manager">Manager</option>
				<option value="Technician">Non-Manager</option>
			</select>
		</div>
	</div>

	<div
		class="verification-content"
		style="
			padding: 24px;
			border: 1px solid var(--colors-surface-border);
			border-radius: 8px;
			background: var(--colors-surface-background);
		"
	>
		<div v-if="workOrder?.status === 'Done'">
			<div class="verification-actions-box" v-if="isManager">
				<div class="verification-actions-box__icon">
					<i class="mdi mdi-shield-check-outline"></i>
				</div>
				<h4>Manager Approval Required</h4>
				<p class="text-muted">
					Review the work order details, photos, and notes before making a decision.
				</p>

				<div
					class="verification-buttons-row"
					style="margin-top: 16px; display: flex; gap: 12px; justify-content: center"
				>
					<Button variant="primary" @click="emit('approve')" style="min-width: 140px">
						<i class="mdi mdi-check-circle" style="margin-right: 6px"></i> Approve
					</Button>
					<Button variant="danger" @click="emit('reject')" style="min-width: 140px">
						<i class="mdi mdi-close-circle" style="margin-right: 6px"></i> Reject
					</Button>
				</div>
			</div>
			<div v-else style="text-align: center; padding: 32px 16px">
				<i
					class="mdi mdi-clock-outline"
					style="font-size: 52px; color: var(--colors-brand-primary)"
				></i>
				<h4 style="margin: 8px 0 4px 0">Awaiting Manager Verification</h4>
				<p class="text-muted" style="margin: 0">
					The work order has been marked as done and is pending manager approval.
				</p>
			</div>
		</div>
		<div v-else-if="currentStepIndex >= 4">
			<div
				class="verification-result-box verification-result-box--approved"
				style="text-align: center; padding: 32px 16px"
			>
				<i class="mdi mdi-check-decagram" style="font-size: 52px; color: #10b981"></i>
				<h4 style="margin: 8px 0 4px 0; color: var(--colors-text-primary)">
					Work Order Approved
				</h4>
				<p class="text-muted" style="margin: 0">
					Approved by Manager level on {{ formatDateString(workOrder.completedDate) }}
				</p>
			</div>
		</div>
		<div v-else>
			<div class="verification-result-box" style="text-align: center; padding: 32px 16px">
				<i
					class="mdi mdi-information-outline"
					style="font-size: 52px; color: var(--colors-text-muted)"
				></i>
				<h4 style="margin: 8px 0 4px 0">No Verification Pending</h4>
				<p class="text-muted" style="margin: 0">
					Verification is only required when the work order is marked as done.
				</p>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.verification-actions-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 32px 16px;
	gap: 12px;

	&__icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: rgba(80, 88, 242, 0.1);
		color: var(--colors-brand-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
	}

	h4 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.verification-buttons-row {
	display: flex;
	gap: 16px;
	margin-top: 12px;
}

.verification-result-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	padding: 36px 16px;

	&--approved {
		background: rgba(16, 185, 129, 0.04);
		border-radius: 8px;
	}

	&--rejected {
		background: rgba(239, 68, 68, 0.04);
		border-radius: 8px;
	}
}
</style>
