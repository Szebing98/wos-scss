<script setup lang="ts">
import Button from "@/components/Button.vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";
import { userDisplayCode } from "@/utils/user-display";

const props = defineProps<{
	workNotes: any[];
	users: any[];
	workOrderStatus: string;
}>();

const emit = defineEmits(["addNote", "editNote", "deleteNote"]);
const dateFormatStore = useDateFormatStore();

function formatDateString(dateStr: string) {
	return dateFormatStore.formatDate(dateStr);
}

function getUserDisplayNameAndCode(note: any) {
	const displayCode = note?.createdByDisplayCode;
	if (displayCode) return userDisplayCode(displayCode, null, "System");

	const userCode = note?.createdBy;
	if (!userCode) return "System";

	// 1. Check loaded dynamic users
	const user = props.users?.find(
		(u: any) =>
			u.code === userCode ||
			u.displayCode === userCode ||
			String(u.code).toLowerCase() === String(userCode).toLowerCase()
	);
	if (user) {
		return userDisplayCode(user.displayCode, user.code, "System");
	}

	// 2. Offline / mock database user mapping fallback
	const localMocks: Record<string, { name: string; displayCode: string }> = {
		"emp001": { name: "John Doe", displayCode: "GS-EMP001" },
		"emp002": { name: "Jane Smith", displayCode: "GS-EMP002" },
		"admin": { name: "System Admin", displayCode: "GS-ADMIN" },
		"kiwi": { name: "Kiwi User", displayCode: "GS-KIWI" },
	};

	const key = String(userCode).toLowerCase();
	if (localMocks[key]) {
		return localMocks[key].displayCode;
	}

	return userDisplayCode(null, userCode, "System");
}

import { ref } from "vue";
import Dialog from "@/components/Dialog.vue";

const isViewMoreOpen = ref(false);
const activeNote = ref<any>(null);

function openViewMore(note: any) {
	activeNote.value = note;
	isViewMoreOpen.value = true;
}

function shouldShowViewMore(content: string) {
	if (!content) return false;
	const lines = content.split("\n");
	if (lines.length > 5) return true;
	if (content.length > 250) return true;
	return false;
}

function getTruncatedContent(content: string) {
	if (!content) return "";
	const lines = content.split("\n");
	if (lines.length > 5) {
		return lines.slice(0, 5).join("\n") + "...";
	}
	if (content.length > 250) {
		return content.substring(0, 250) + "...";
	}
	return content;
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
					<strong class="note-card__author">{{ getUserDisplayNameAndCode(note) }}</strong>
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
			<div class="note-card__content" v-if="shouldShowViewMore(note.content)">
				{{ getTruncatedContent(note.content) }}
				<button
					class="view-more-link"
					@click="openViewMore(note)"
					style="
						background: none;
						border: none;
						color: var(--colors-brand-primary, #5058f2);
						font-weight: 600;
						font-size: 13px;
						padding: 0;
						margin-left: 4px;
						cursor: pointer;
						text-decoration: underline;
					"
				>
					View More
				</button>
			</div>
			<div class="note-card__content" v-else>{{ note.content }}</div>
		</div>
	</div>

	<!-- View Full Note Dialog -->
	<Dialog
		v-model="isViewMoreOpen"
		title="Work Note Details"
		maxWidth="550px"
	>
		<div v-if="activeNote" style="display: flex; flex-direction: column; gap: 12px">
			<div class="note-card__meta" style="margin-bottom: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px;">
				<strong class="note-card__author" style="font-size: 13px; color: var(--colors-text-primary);">{{ getUserDisplayNameAndCode(activeNote) }}</strong>
				<span class="note-card__date" style="font-size: 12px; color: var(--colors-text-muted);">{{ formatDateString(activeNote.createdAt) }}</span>
				<span
					:class="[
						'note-badge',
						activeNote.viewLevel === 'internal'
							? 'note-badge--internal'
							: 'note-badge--external',
					]"
					:style="{
						fontSize: '11px',
						padding: '2px 8px',
						borderRadius: '12px',
						fontWeight: '500',
						backgroundColor: activeNote.viewLevel === 'internal' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(16, 185, 129, 0.1)',
						color: activeNote.viewLevel === 'internal' ? 'var(--colors-brand-primary)' : 'var(--colors-success)',
						display: 'inline-block'
					}"
				>
					{{ activeNote.viewLevel === "internal" ? "Internal" : "External" }}
				</span>
			</div>
			<div style="font-size: 14px; color: var(--colors-text-secondary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; padding: 4px 0;">
				{{ activeNote.content }}
			</div>
		</div>
		<template #footer>
			<Button variant="secondary" @click="isViewMoreOpen = false">Close</Button>
		</template>
	</Dialog>
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
	border: 2px dashed var(--colors-surface-border);
	border-radius: 8px;
	background-color: var(--colors-surface-card);
}

.notes-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.note-card {
	background-color: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

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
		padding: 6px;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		transition: all 0.2s;

		&:hover {
			transform: scale(1.05);
		}

		i {
			font-size: 16px;
		}

		&--edit {
			background: rgba(80, 88, 242, 0.06);
			border: 1px solid rgba(80, 88, 242, 0.25);
			color: var(--colors-brand-primary, #5058f2);

			&:hover {
				background: var(--colors-brand-primary, #5058f2);
				border-color: var(--colors-brand-primary, #5058f2);
				color: #ffffff;
			}
		}

		&--delete {
			background: rgba(239, 68, 68, 0.06);
			border: 1px solid rgba(239, 68, 68, 0.25);
			color: var(--colors-error, #ef4444);

			&:hover {
				background: var(--colors-error, #ef4444);
				border-color: var(--colors-error, #ef4444);
				color: #ffffff;
			}
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
