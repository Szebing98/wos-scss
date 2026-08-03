<script setup lang="ts">
import { computed, ref } from "vue";
import Dialog from "@/components/Dialog.vue";
import Button from "@/components/Button.vue";

interface UploadItem {
	file: File;
	baseName: string;
	extension: string;
	previewUrl: string;
}

const props = defineProps<{
	files: UploadItem[];
	category: string;
}>();

const emit = defineEmits<{
	(e: "rename", index: number, value: string): void;
	(e: "remove", index: number): void;
	(e: "confirm"): void;
	(e: "cancel"): void;
}>();

const isOpen = ref(false);
const totalSize = computed(() => props.files.reduce((sum, item) => sum + item.file.size, 0));
const canUpload = computed(
	() => props.files.length > 0 && props.files.every((item) => item.baseName.trim()),
);

function formatSize(bytes: number) {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function open() {
	isOpen.value = true;
}

function close() {
	isOpen.value = false;
}

function cancel() {
	close();
	emit("cancel");
}

function confirm() {
	if (!canUpload.value) return;
	close();
	emit("confirm");
}

defineExpose({ open, close });
</script>

<template>
	<Dialog v-model="isOpen" title="Review files" maxWidth="760px" @cancel="emit('cancel')">
		<div class="upload-review">
			<div class="upload-review__summary">
				<div class="upload-review__summary-icon">
					<i class="mdi mdi-cloud-upload-outline"></i>
				</div>
				<div>
					<strong>{{ files.length }} {{ files.length === 1 ? "file" : "files" }} ready</strong>
					<p>{{ category }} · {{ formatSize(totalSize) }} total</p>
				</div>
				<span class="upload-review__badge">Ready to upload</span>
			</div>

			<div class="upload-review__grid">
				<article v-for="(item, index) in files" :key="`${item.file.name}-${index}`" class="upload-file">
					<div class="upload-file__preview">
						<img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.file.name" />
						<div v-else class="upload-file__document">
							<i class="mdi mdi-file-pdf-box"></i>
							<span>PDF</span>
						</div>
						<button type="button" class="upload-file__remove" title="Remove file" @click="emit('remove', index)">
							<i class="mdi mdi-close"></i>
						</button>
					</div>
					<div class="upload-file__body">
						<label :for="`upload-name-${index}`">File name</label>
						<div class="upload-file__name-field">
							<input
								:id="`upload-name-${index}`"
								:value="item.baseName"
								type="text"
								@input="emit('rename', index, ($event.target as HTMLInputElement).value)"
							/>
							<span>{{ item.extension }}</span>
						</div>
						<small>{{ formatSize(item.file.size) }}</small>
					</div>
				</article>
			</div>
		</div>

		<template #footer>
			<div class="upload-review__footer">
				<span><i class="mdi mdi-shield-check-outline"></i> Maximum 10 MB per file</span>
				<div class="upload-review__actions">
					<Button variant="secondary" @click="cancel">Cancel</Button>
					<Button variant="primary" :disabled="!canUpload" @click="confirm">
						<i class="mdi mdi-cloud-upload-outline"></i>
						Upload {{ files.length }}
					</Button>
				</div>
			</div>
		</template>
	</Dialog>
</template>

<style scoped lang="scss">
.upload-review {
	display: flex;
	flex-direction: column;
	gap: 18px;

	&__summary {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border: 1px solid rgba(80, 88, 242, 0.18);
		border-radius: 12px;
		background: linear-gradient(135deg, rgba(80, 88, 242, 0.09), rgba(80, 88, 242, 0.025));

		strong { color: var(--colors-text-primary); font-size: 14px; }
		p { margin: 3px 0 0; color: var(--colors-text-muted); font-size: 12px; }
	}

	&__summary-icon {
		width: 42px;
		height: 42px;
		border-radius: 11px;
		display: grid;
		place-items: center;
		background: var(--colors-brand-primary);
		color: white;
		font-size: 22px;
		box-shadow: 0 6px 16px rgba(80, 88, 242, 0.22);
	}

	&__badge {
		margin-left: auto;
		padding: 5px 9px;
		border-radius: 999px;
		background: rgba(34, 197, 94, 0.12);
		color: #16a34a;
		font-size: 11px;
		font-weight: 700;
	}

	&__grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 14px;
	}

	&__footer {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;

		> span { color: var(--colors-text-muted); font-size: 11px; }
	}

	&__actions { display: flex; gap: 8px; }
}

.upload-file {
	min-width: 0;
	border: 1px solid var(--colors-surface-border);
	border-radius: 12px;
	overflow: hidden;
	background: var(--colors-surface-card);
	transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;

	&:hover {
		border-color: rgba(80, 88, 242, 0.45);
		box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
		transform: translateY(-1px);
	}

	&__preview {
		height: 128px;
		position: relative;
		background: var(--colors-surface-background);

		img { width: 100%; height: 100%; object-fit: cover; display: block; }
	}

	&__document {
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		color: #ef4444;
		background: linear-gradient(145deg, rgba(239, 68, 68, 0.04), rgba(239, 68, 68, 0.12));

		i { font-size: 44px; }
		span { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }
	}

	&__remove {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 27px;
		height: 27px;
		border: 0;
		border-radius: 50%;
		background: rgba(15, 23, 42, 0.7);
		color: white;
		cursor: pointer;
		display: grid;
		place-items: center;
		backdrop-filter: blur(4px);

		&:hover { background: #ef4444; }
	}

	&__body {
		padding: 11px;

		label { display: block; margin-bottom: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--colors-text-muted); }
		small { display: block; margin-top: 6px; color: var(--colors-text-muted); font-size: 10px; }
	}

	&__name-field {
		display: flex;
		align-items: center;
		border: 1px solid var(--colors-surface-border);
		border-radius: 7px;
		background: var(--colors-surface-background);
		overflow: hidden;

		&:focus-within { border-color: var(--colors-brand-primary); box-shadow: 0 0 0 3px rgba(80, 88, 242, 0.1); }
		input { min-width: 0; flex: 1; border: 0; outline: 0; padding: 8px 4px 8px 9px; background: transparent; color: var(--colors-text-primary); font-size: 12px; }
		span { padding-right: 8px; color: var(--colors-text-muted); font-size: 11px; }
	}
}

@media (max-width: 600px) {
	.upload-review__badge { display: none; }
	.upload-review__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
	.upload-review__footer { align-items: stretch; flex-direction: column; }
	.upload-review__actions { display: grid; grid-template-columns: 1fr 1fr; }
	.upload-file__preview { height: 104px; }
}
</style>
