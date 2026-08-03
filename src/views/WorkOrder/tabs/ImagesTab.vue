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
		multiple
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
@use "@/styles/pages/WorkOrder/tabs/_images-tab.scss";
</style>
