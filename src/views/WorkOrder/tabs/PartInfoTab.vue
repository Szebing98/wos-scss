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
@use "@/styles/pages/WorkOrder/tabs/_part-info-tab.scss";
</style>
