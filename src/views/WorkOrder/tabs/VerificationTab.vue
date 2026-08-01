<script setup lang="ts">
import Button from "@/components/Button.vue";
import { useAuthStore } from "@/stores/auth.store";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const authStore = useAuthStore();
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
			<div
				class="verification-actions-box"
				v-if="
					isManager &&
					(authStore.can('mark_as_completed', 'WorkOrder') ||
						authStore.can('reject', 'WorkOrder'))
				"
			>
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
					<Button
						v-if="authStore.can('mark_as_completed', 'WorkOrder')"
						variant="primary"
						@click="emit('approve')"
						style="min-width: 140px"
					>
						<i class="mdi mdi-check-circle" style="margin-right: 6px"></i> Approve
					</Button>
					<Button
						v-if="authStore.can('reject', 'WorkOrder')"
						variant="danger"
						@click="emit('reject')"
						style="min-width: 140px"
					>
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
				<h4 style="margin: 8px 0 4px 0">Verification Pending</h4>
				<p class="text-muted" style="margin: 0">
					Verification is required to mark the work order as completed.
				</p>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use "@/styles/pages/WorkOrder/tabs/_verification-tab.scss";
</style>
