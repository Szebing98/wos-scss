<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
	images: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete", "preview"]);

const imageInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);
const activeCategory = ref<string>("");

function triggerImageUpload(category: string) {
	activeCategory.value = category;
	imageInput.value?.click();
}

function triggerCameraUpload(category: string) {
	activeCategory.value = category;
	cameraInput.value?.click();
}

function handleFileChange(event: Event) {
	emit("upload", { event, category: activeCategory.value });
}
</script>

<template>
	<div class="card-header">
		<h3>Job Images</h3>
		<p class="text-muted">Upload and rename photos for each stage of the job.</p>
	</div>

	<!-- Hidden file inputs -->
	<input
		type="file"
		ref="imageInput"
		style="display: none"
		@change="handleFileChange"
		accept="image/*"
	/>
	<input
		type="file"
		ref="cameraInput"
		style="display: none"
		@change="handleFileChange"
		accept="image/*"
		capture="environment"
	/>

	<div class="image-categories">
		<div class="image-category" v-for="cat in ['Before', 'In Progress', 'After']" :key="cat">
			<h4>
				{{ cat }}
				<small class="text-muted"
					>({{ images.filter((i: any) => i.category === cat).length }}/4)</small
				>
			</h4>
			<div class="image-grid">
				<div
					class="image-card"
					v-for="img in images.filter((i: any) => i.category === cat)"
					:key="img.id"
				>
					<button
						v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
						class="del-btn"
						@click.stop="emit('delete', img.guid || '')"
					>
						<i class="mdi mdi-trash-can-outline"></i>
					</button>
					<div class="image-preview" :style="{ backgroundImage: `url(${img.url})` }" @click="emit('preview', img)">
					</div>
					<div class="image-name-display" @click="emit('preview', img)">{{ img.name }}</div>
				</div>
				<div
					class="image-placeholder-card"
					v-if="isEditing && images.filter((i: any) => i.category === cat).length < 4"
					@click="triggerImageUpload(cat)"
				>
					<i class="mdi mdi-image-plus"></i>
					<span>Upload Photo</span>
				</div>
				<div
					class="image-placeholder-card image-placeholder-card--camera"
					v-if="isEditing && images.filter((i: any) => i.category === cat).length < 4"
					@click="triggerCameraUpload(cat)"
				>
					<i class="mdi mdi-camera"></i>
					<span>Take Photo</span>
				</div>
				<div
					v-if="images.filter((i: any) => i.category === cat).length === 0 && !isEditing"
					class="no-image-text"
				>
					No image uploaded
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.image-categories {
	display: flex;
	flex-direction: column;
	gap: 24px;
	.image-category {
		h4 {
			margin: 0 0 12px 0;
			font-size: 14px;
			color: var(--colors-text-secondary);
			border-bottom: 1px solid var(--colors-surface-border);
			padding-bottom: 8px;
		}
	}
}
.image-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16px;
}
.image-card {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 140px;
	flex-shrink: 0;
	position: relative;

	.image-preview {
		aspect-ratio: 1;
		border-radius: 8px;
		background-size: cover;
		background-position: center;
		border: 1px solid var(--colors-surface-border);
		cursor: pointer;
	}

	.del-btn {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(239, 68, 68, 0.06);
		border: 1px solid rgba(239, 68, 68, 0.25);
		color: var(--colors-error, #ef4444);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 14px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
		z-index: 10;
		transition: all 0.2s;

		&:hover {
			background: var(--colors-error, #ef4444);
			border-color: var(--colors-error, #ef4444);
			color: #ffffff;
			transform: scale(1.1);
		}
	}
	.image-name-input {
		width: 100%;
		padding: 6px;
		font-size: 12px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 4px;
	}
	.image-name-display {
		font-size: 12px;
		color: var(--colors-text-secondary);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
	}
}
.image-placeholder-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border: 2px dashed var(--colors-surface-border);
	border-radius: 8px;
	height: 140px;
	width: 140px;
	flex-shrink: 0;
	gap: 8px;
	color: var(--colors-text-secondary);
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		border-color: var(--colors-brand-primary);
		color: var(--colors-brand-primary);
		background-color: var(--colors-bg-hover);
	}

	i {
		font-size: 24px;
	}

	span {
		font-size: 11px;
		font-weight: 500;
	}

	&--camera {
		@media (min-width: 768px) {
			display: none !important;
		}
	}
}
.no-image-text {
	color: var(--colors-text-muted);
	font-size: 13px;
	font-style: italic;
	padding: 4px 0;
}
</style>
