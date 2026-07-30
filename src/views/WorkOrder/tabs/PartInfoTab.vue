<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";

const props = defineProps<{
	partInfoPhotos: any[];
	isEditing: boolean;
	isManager: boolean;
	workOrderStatus: string;
}>();

const emit = defineEmits(["upload", "delete"]);
const partInfoInput = ref<HTMLInputElement | null>(null);
</script>

<template>
	<div
		class="card-header"
		style="display: flex; justify-content: space-between; align-items: center"
	>
		<div style="display: block">
			<div style="display: flex; align-items: center; gap: 12px">
				<h3>Part Info</h3>
				<span class="photo-counter-badge">{{ partInfoPhotos.length }}/12 Photos</span>
			</div>
			<p class="text-muted" style="margin: 0px">
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

	<hr style="margin: 8px" />

	<div class="photo-grid-12">
		<div v-for="photo in partInfoPhotos" :key="photo.id" class="photo-slot">
			<div class="photo-slot__img-wrap">
				<img :src="photo.url" :alt="photo.name" class="photo-slot__img" />
				<button
					v-if="isEditing || (isManager && workOrderStatus === 'Claimed')"
					@click="emit('delete', photo.guid || '')"
					title="Remove photo"
				>
					<i class="mdi mdi-close"></i>
				</button>
			</div>
			<div class="photo-slot__name">{{ photo.name }}</div>
		</div>
		<div
			v-if="
				(isEditing || (isManager && workOrderStatus === 'Claimed')) &&
				partInfoPhotos.length < 12
			"
			class="photo-slot photo-slot--add"
			@click="partInfoInput?.click()"
		>
			<i class="mdi mdi-camera-plus"></i>
			<span>Upload Photo</span>
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

	&__img-wrap {
		position: relative;
		width: 100%;
		height: 120px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--colors-surface-background);
	}

	&__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	button {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 14px;
		transition:
			transform 0.2s,
			background-color 0.2s;

		&:hover {
			background: #dc2626;
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
