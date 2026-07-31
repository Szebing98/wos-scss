<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";

const props = defineProps<{
	partInfoPhotos: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete", "preview"]);
const partInfoInput = ref<HTMLInputElement | null>(null);
const partInfoCameraInput = ref<HTMLInputElement | null>(null);
</script>

<template>
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: center"
	>
		<div style="display: block">
			<div style="display: flex; align-items: center; gap: 12px">
				<h3>Part Info</h3>
				<span>
					<b>( {{ partInfoPhotos.length }}/12 )</b>
				</span>
			</div>
			<p class="text-muted" style="margin: 2px">
				Upload up to 12 photos of parts, components, and job-related materials.
			</p>
		</div>

		<input
			type="file"
			ref="partInfoInput"
			style="display: none"
			@change="emit('upload', $event)"
			accept="image/*"
		/>
		<input
			type="file"
			ref="partInfoCameraInput"
			style="display: none"
			@change="emit('upload', $event)"
			accept="image/*"
			capture="environment"
		/>

		<Button
			v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
			variant="primary"
			@click="partInfoInput?.click()"
			:disabled="partInfoPhotos.length >= 12"
		>
			<i class="mdi mdi-camera-plus" style="margin-right: 4px"></i>
			Add Photo
		</Button>
	</div>

	<div class="photo-grid-12">
		<div v-for="photo in partInfoPhotos" :key="photo.id" class="photo-slot">
			<button
				v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
				class="photo-slot__del"
				@click.stop="emit('delete', photo.guid || '')"
				title="Remove photo"
			>
				<i class="mdi mdi-trash-can-outline"></i>
			</button>
			<div class="photo-slot__img-wrap" @click="emit('preview', photo)">
				<img :src="photo.url" :alt="photo.name" class="photo-slot__img" />
			</div>
			<div class="photo-slot__name" @click="emit('preview', photo)">{{ photo.name }}</div>
		</div>
		<div
			v-if="
				(isEditing || (isManager && workOrderStatus === 'Claimed')) &&
				partInfoPhotos.length < 12
			"
			class="photo-slot photo-slot--add"
			@click="partInfoInput?.click()"
		>
			<i class="mdi mdi-image-plus"></i>
			<span>Upload Photo</span>
		</div>
		<div
			v-if="
				(isEditing || (isManager && workOrderStatus === 'Claimed')) &&
				partInfoPhotos.length < 12
			"
			class="photo-slot photo-slot--add photo-slot--add-camera"
			@click="partInfoCameraInput?.click()"
		>
			<i class="mdi mdi-camera"></i>
			<span>Take Photo</span>
		</div>
		<div
			v-if="partInfoPhotos.length === 0 && !isEditing && workOrderStatus !== 'Claimed'"
			class="photo-grid-empty"
		>
			<i class="mdi mdi-image-off"></i>
			<p>No part info photos uploaded yet.</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
.photo-counter-badge {
	background: rgba(80, 88, 242, 0.1);
	color: var(--colors-brand-primary);
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 600;
}

.photo-grid-12 {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 16px;
	padding-top: 16px;
}

.photo-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	background: var(--colors-surface-card);
	border: 1px solid var(--colors-surface-border);
	border-radius: 8px;
	padding: 8px;
	position: relative;

	&__img-wrap {
		position: relative;
		width: 100%;
		height: 120px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--colors-surface-background);
		cursor: pointer;
	}

	&__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&__del {
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

	&__name {
		font-size: 11px;
		color: var(--colors-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: center;
	}

	&__name-input {
		width: 100%;
		padding: 4px;
		font-size: 11px;
		border: 1px solid var(--colors-surface-border);
		border-radius: 4px;
		text-align: center;
		background: var(--colors-surface-background);
		color: var(--colors-text-primary);

		&:focus {
			outline: none;
			border-color: var(--colors-brand-primary);
		}
	}

	&--add {
		height: 154px;
		border: 2px dashed var(--colors-surface-border);
		background: transparent;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		color: var(--colors-text-muted);
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			border-color: var(--colors-brand-primary);
			color: var(--colors-brand-primary);
			background: rgba(80, 88, 242, 0.04);
		}

		i {
			font-size: 28px;
		}

		span {
			font-size: 12px;
			font-weight: 500;
		}

		&-camera {
			@media (min-width: 768px) {
				display: none !important;
			}
		}
	}
}

.photo-grid-empty {
	grid-column: 1 / -1;
	text-align: center;
	padding: 40px 20px;
	color: var(--colors-text-muted);

	i {
		font-size: 40px;
		margin-bottom: 8px;
		opacity: 0.4;
	}

	p {
		margin: 0;
		font-size: 13px;
	}
}
</style>
