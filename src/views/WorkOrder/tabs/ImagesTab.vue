<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
	images: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete", "rename"]);

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
					<div class="image-preview" :style="{ backgroundImage: `url(${img.url})` }">
						<button
							v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
							class="del-btn"
							@click="emit('delete', img.guid || '')"
						>
							<i class="mdi mdi-close"></i>
						</button>
					</div>
					<input
						v-if="isEditing"
						type="text"
						v-model="img.name"
						class="image-name-input"
						@blur="emit('rename', img)"
					/>
					<div v-else class="image-name-display">{{ img.name }}</div>
				</div>
				<div
					class="image-placeholder-split"
					v-if="isEditing && images.filter((i: any) => i.category === cat).length < 4"
				>
					<div class="split-btn" @click="triggerImageUpload(cat)">
						<i class="mdi mdi-image-plus"></i>
						<span>Upload</span>
					</div>
					<div class="split-btn split-btn--camera" @click="triggerCameraUpload(cat)">
						<i class="mdi mdi-camera"></i>
						<span>Camera</span>
					</div>
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
	.image-preview {
		aspect-ratio: 1;
		border-radius: 8px;
		background-size: cover;
		background-position: center;
		position: relative;
		border: 1px solid var(--colors-surface-border);
		.del-btn {
			position: absolute;
			top: -6px;
			right: -6px;
			background: var(--colors-danger);
			color: white;
			border: none;
			border-radius: 50%;
			width: 22px;
			height: 22px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			font-size: 14px;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
			transition: transform 0.2s;
			&:hover {
				transform: scale(1.1);
			}
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
	}
}
.image-placeholder-split {
	display: flex;
	flex-direction: column;
	border: 2px dashed var(--colors-border);
	border-radius: 8px;
	height: 150px;
	overflow: hidden;
	width: 140px;
	flex-shrink: 0;

	.split-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		cursor: pointer;
		font-size: 12px;
		color: var(--colors-text-secondary);
		background-color: transparent;
		transition: background-color 0.2s;

		&:hover {
			background-color: var(--colors-bg-hover);
			color: var(--colors-brand-primary);
		}

		i {
			font-size: 20px;
		}

		&--camera {
			border-top: 1px dashed var(--colors-border);
		}
	}
}
</style>
