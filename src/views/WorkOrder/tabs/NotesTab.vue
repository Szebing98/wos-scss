<script setup lang="ts">
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const props = defineProps<{
	workNotes: any[];
	workOrderStatus: string;
}>();

const emit = defineEmits(["addNote", "editNote", "deleteNote"]);
const dateFormatStore = useDateFormatStore();

function formatDateString(dateStr: string) {
	return dateFormatStore.formatDateTime(dateStr);
}
</script>

<template>
	<div
		class="card-header"
		style="
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20px;
		"
	>
		<div>
			<h3>Work Notes ({{ workNotes.length }})</h3>
			<p class="text-muted">
				Team-only internal discussions vs. external notes shared with the customer.
			</p>
		</div>
		<Button
			v-if="workOrderStatus === 'InProgress'"
			variant="primary"
			@click="emit('addNote')"
		>
			<i class="mdi mdi-plus" style="margin-right: 4px"></i> Add Note
		</Button>
	</div>

	<div class="alert-box alert-info" style="margin-bottom: 20px">
		<i class="mdi mdi-information"></i>
		<span
			>Use <strong>Internal</strong> for team-only discussion and
			<strong>External</strong> for notes shared with the Customer.</span
		>
	</div>

	<div v-if="workNotes.length === 0" class="empty-notes-box">
		<i
			class="mdi mdi-note-text-outline"
			style="font-size: 36px; color: var(--colors-text-muted)"
		></i>
		<p class="text-muted" style="margin-top: 8px">No work notes added yet.</p>
	</div>
	<div v-else class="notes-list">
		<div v-for="note in workNotes" :key="note.guid" class="note-card">
			<div class="note-card__header">
				<div class="note-card__meta">
					<strong class="note-card__author">{{ note.createdBy || "System" }}</strong>
					<span class="note-card__date">{{ formatDateString(note.createdAt) }}</span>
					<span
						:class="[
							'note-badge',
							note.viewLevel === 'internal'
								? 'note-badge--internal'
								: 'note-badge--external',
						]"
					>
						{{ note.viewLevel === "internal" ? "Internal" : "External" }}
					</span>
				</div>
				<div class="note-card__actions" v-if="workOrderStatus === 'InProgress'">
					<button
						class="note-btn note-btn--edit"
						@click="emit('editNote', note)"
						title="Edit note"
					>
						<i class="mdi mdi-pencil-outline"></i>
					</button>
					<button
						class="note-btn note-btn--delete"
						@click="emit('deleteNote', note.guid)"
						title="Delete note"
					>
						<i class="mdi mdi-trash-can-outline"></i>
					</button>
				</div>
			</div>
			<div class="note-card__content">{{ note.content }}</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.alert-info {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	background-color: #ebf5ff;
	color: #1e40af;
	padding: 16px 20px;
	border-radius: 8px;
	border: 1px solid #bfdbfe;
	i {
		font-size: 20px;
		margin-top: -2px;
	}
	span {
		font-size: 14px;
		line-height: 1.5;
	}
}

.empty-notes-box {
	text-align: center;
	padding: 40px 20px;
	border: 1px dashed var(--colors-border);
	border-radius: 8px;
	background-color: var(--colors-bg-card);
}

.notes-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.note-card {
	background-color: var(--colors-bg-card);
	border: 1px solid var(--colors-border);
	border-radius: 8px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	box-shadow: var(--shadow-xs);

	.note-card__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.note-card__meta {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 12px;
	}

	.note-card__author {
		font-size: 13px;
		color: var(--colors-text-primary);
	}

	.note-card__date {
		font-size: 12px;
		color: var(--colors-text-muted);
	}

	.note-badge {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 12px;
		font-weight: 500;

		&--internal {
			background-color: rgba(14, 165, 233, 0.1);
			color: var(--colors-brand-primary);
		}

		&--external {
			background-color: rgba(16, 185, 129, 0.1);
			color: var(--colors-success);
		}
	}

	.note-card__actions {
		display: flex;
		gap: 8px;
	}

	.note-btn {
		background: none;
		border: none;
		padding: 4px;
		border-radius: 4px;
		cursor: pointer;
		color: var(--colors-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			color 0.2s,
			background-color 0.2s;

		&:hover {
			background-color: var(--colors-bg-hover);
			color: var(--colors-text-primary);
		}

		&--delete:hover {
			color: var(--colors-error);
		}
	}

	.note-card__content {
		font-size: 13px;
		color: var(--colors-text-secondary);
		line-height: 1.5;
		white-space: pre-wrap;
	}
}
</style>
