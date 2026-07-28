<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue";
import { loadGoogleMapsScript } from "@/utils/googleMaps";

const props = withDefaults(
	defineProps<{
		location?: string;
		latitude?: number;
		longitude?: number;
		readonly?: boolean;
		height?: string;
		label?: string;
		placeholder?: string;
		showCoords?: boolean;
	}>(),
	{
		location: "",
		latitude: 0,
		longitude: 0,
		readonly: false,
		height: "320px",
		label: "Location Address",
		placeholder: "Search or enter location address...",
		showCoords: false,
	},
);

const emit = defineEmits<{
	(e: "update:location", value: string): void;
	(e: "update:latitude", value: number): void;
	(e: "update:longitude", value: number): void;
	(e: "change", payload: { location: string; latitude: number; longitude: number }): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

const addressText = ref(props.location || "");
const latVal = ref<number>(props.latitude || 0);
const lngVal = ref<number>(props.longitude || 0);

const isLoading = ref(true);
const mapError = ref("");
const isLocating = ref(false);

let mapInstance: any = null;
let markerInstance: any = null;
let autocompleteInstance: any = null;
let geocoderInstance: any = null;

// Default center: Kuching, Sarawak if none provided
const DEFAULT_CENTER = { lat: 1.5533, lng: 110.3592 };

watch(
	() => props.location,
	(val) => {
		if (val !== undefined && val !== addressText.value) {
			addressText.value = val || "";
		}
	},
);

watch(
	() => props.latitude,
	(val) => {
		if (val !== undefined && val !== latVal.value) {
			latVal.value = val || 0;
			updateMapFromCoordinates();
		}
	},
);

watch(
	() => props.longitude,
	(val) => {
		if (val !== undefined && val !== lngVal.value) {
			lngVal.value = val || 0;
			updateMapFromCoordinates();
		}
	},
);

function emitChanges(newAddress: string, newLat: number, newLng: number) {
	addressText.value = newAddress;
	latVal.value = Number(newLat.toFixed(7));
	lngVal.value = Number(newLng.toFixed(7));

	emit("update:location", addressText.value);
	emit("update:latitude", latVal.value);
	emit("update:longitude", lngVal.value);
	emit("change", {
		location: addressText.value,
		latitude: latVal.value,
		longitude: lngVal.value,
	});
}

async function initMap() {
	isLoading.value = true;
	mapError.value = "";

	try {
		const google = await loadGoogleMapsScript();

		if (!mapContainer.value) return;

		const initialCenter =
			latVal.value && lngVal.value
				? { lat: Number(latVal.value), lng: Number(lngVal.value) }
				: DEFAULT_CENTER;

		const zoomLevel = latVal.value && lngVal.value ? 15 : 12;

		mapInstance = new google.maps.Map(mapContainer.value, {
			center: initialCenter,
			zoom: zoomLevel,
			mapTypeControl: true,
			streetViewControl: false,
			fullscreenControl: true,
			zoomControl: true,
		});

		geocoderInstance = new google.maps.Geocoder();

		// Add Marker
		markerInstance = new google.maps.Marker({
			position: initialCenter,
			map: mapInstance,
			draggable: !props.readonly,
			animation: google.maps.Animation.DROP,
			title: "Selected Location",
		});

		if (!props.readonly) {
			// Click on map to place marker
			mapInstance.addListener("click", (e: any) => {
				const clickLat = e.latLng.lat();
				const clickLng = e.latLng.lng();
				setMarkerPosition(clickLat, clickLng, true);
			});

			// Drag marker to update
			markerInstance.addListener("dragend", (e: any) => {
				const dragLat = e.latLng.lat();
				const dragLng = e.latLng.lng();
				setMarkerPosition(dragLat, dragLng, true);
			});

			// Setup Places Autocomplete if search input exists
			if (searchInput.value && google.maps.places) {
				autocompleteInstance = new google.maps.places.Autocomplete(searchInput.value, {
					fields: ["formatted_address", "geometry", "name"],
				});

				autocompleteInstance.addListener("place_changed", () => {
					const place = autocompleteInstance.getPlace();
					if (place && place.geometry && place.geometry.location) {
						const lat = place.geometry.location.lat();
						const lng = place.geometry.location.lng();
						const formattedAddress =
							place.formatted_address || place.name || addressText.value;

						mapInstance.setCenter({ lat, lng });
						mapInstance.setZoom(16);
						markerInstance.setPosition({ lat, lng });

						emitChanges(formattedAddress, lat, lng);
					}
				});
			}
		}

		isLoading.value = false;
	} catch (err: any) {
		console.error("Google Maps Error:", err);
		isLoading.value = false;
		mapError.value = err.message || "Failed to initialize Google Maps.";
	}
}

function setMarkerPosition(lat: number, lng: number, reverseGeocode = false) {
	if (!markerInstance || !mapInstance) return;

	const pos = { lat, lng };
	markerInstance.setPosition(pos);
	mapInstance.panTo(pos);

	if (reverseGeocode && geocoderInstance) {
		geocoderInstance.geocode({ location: pos }, (results: any[], status: string) => {
			if (status === "OK" && results[0]) {
				emitChanges(results[0].formatted_address, lat, lng);
			} else {
				emitChanges(addressText.value, lat, lng);
			}
		});
	} else {
		emitChanges(addressText.value, lat, lng);
	}
}

function updateMapFromCoordinates() {
	if (mapInstance && markerInstance && latVal.value && lngVal.value) {
		const pos = { lat: Number(latVal.value), lng: Number(lngVal.value) };
		markerInstance.setPosition(pos);
		mapInstance.panTo(pos);
	}
}

function searchAddressManual() {
	if (props.readonly || !geocoderInstance || !addressText.value.trim()) return;

	geocoderInstance.geocode({ address: addressText.value }, (results: any[], status: string) => {
		if (status === "OK" && results[0] && results[0].geometry) {
			const loc = results[0].geometry.location;
			const lat = loc.lat();
			const lng = loc.lng();

			mapInstance.setCenter({ lat, lng });
			mapInstance.setZoom(16);
			markerInstance.setPosition({ lat, lng });

			emitChanges(results[0].formatted_address, lat, lng);
		}
	});
}

function locateUser() {
	if (props.readonly || !navigator.geolocation) return;

	isLocating.value = true;
	navigator.geolocation.getCurrentPosition(
		(pos) => {
			isLocating.value = false;
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			setMarkerPosition(lat, lng, true);
		},
		(err) => {
			isLocating.value = false;
			alert(`Geolocation error: ${err.message}`);
		},
		{ enableHighAccuracy: true, timeout: 10000 },
	);
}

function onAddressInput(e: Event) {
	const target = e.target as HTMLInputElement;
	addressText.value = target.value;
	emit("update:location", target.value);
}

function onCoordInput() {
	emitChanges(addressText.value, latVal.value || 0, lngVal.value || 0);
	updateMapFromCoordinates();
}

onMounted(() => {
	initMap();
});

onUnmounted(() => {
	if (autocompleteInstance && window.google?.maps?.event) {
		window.google.maps.event.clearInstanceListeners(autocompleteInstance);
	}
});
</script>

<template>
	<div class="google-map-picker">
		<!-- Search & Controls (Editable Mode) -->
		<div v-if="!readonly" class="map-controls">
			<div class="search-bar-row">
				<div class="search-input-wrapper">
					<i class="mdi mdi-map-marker-outline search-icon"></i>
					<input
						ref="searchInput"
						type="text"
						class="search-input"
						:value="addressText"
						:placeholder="placeholder"
						@input="onAddressInput"
						@keydown.enter.prevent="searchAddressManual"
					/>
					<button
						v-if="addressText"
						type="button"
						class="clear-btn"
						title="Clear input"
						@click="emitChanges('', 0, 0)"
					>
						<i class="mdi mdi-close"></i>
					</button>
				</div>
				<button
					type="button"
					class="btn-locate"
					:disabled="isLocating"
					title="Use Current Location"
					@click="locateUser"
				>
					<i
						class="mdi"
						:class="isLocating ? 'mdi-loading mdi-spin' : 'mdi-crosshairs-gps'"
					></i>
					<span>{{ isLocating ? "Locating..." : "My Location" }}</span>
				</button>
			</div>
		</div>

		<!-- Readonly Location Text -->
		<div v-else-if="location" class="readonly-location-display">
			<i class="mdi mdi-map-marker text-primary"></i>
			<span>{{ location }}</span>
		</div>

		<!-- Map View Container -->
		<div class="map-wrapper" :style="{ height: height }">
			<div ref="mapContainer" class="map-element"></div>

			<!-- Loading Overlay -->
			<div v-if="isLoading" class="map-overlay">
				<i class="mdi mdi-loading mdi-spin spinner-icon"></i>
				<span>Loading Google Maps...</span>
			</div>

			<!-- Error Fallback Overlay -->
			<div v-else-if="mapError" class="map-overlay map-overlay--error">
				<i class="mdi mdi-alert-circle-outline error-icon"></i>
				<p class="error-msg">{{ mapError }}</p>
				<span class="error-hint">Manual address & coordinate input remains available.</span>
			</div>
		</div>

		<!-- Subtle Map Hint -->
		<div class="map-hint" v-if="!readonly">
			<i class="mdi mdi-information-outline"></i>
			<span
				>Click or drag the marker on the map to pin location. Coordinates are set
				automatically.</span
			>
		</div>

		<!-- Coordinates Footer (Optional) -->
		<template v-if="showCoords">
			<div class="coords-bar" v-if="!readonly">
				<div class="coord-field">
					<label>Latitude:</label>
					<input
						type="number"
						step="any"
						v-model.number="latVal"
						placeholder="0.000000"
						@change="onCoordInput"
					/>
				</div>
				<div class="coord-field">
					<label>Longitude:</label>
					<input
						type="number"
						step="any"
						v-model.number="lngVal"
						placeholder="0.000000"
						@change="onCoordInput"
					/>
				</div>
			</div>
			<div class="coords-bar coords-bar--readonly" v-else-if="latitude || longitude">
				<span class="coord-tag">Lat: {{ latitude }}</span>
				<span class="coord-tag">Lng: {{ longitude }}</span>
			</div>
		</template>
	</div>
</template>

<style lang="scss" scoped>
.google-map-picker {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 100%;

	.map-controls {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.search-bar-row {
		display: flex;
		gap: 8px;
		align-items: center;

		@media (max-width: 640px) {
			flex-direction: column;
			align-items: stretch;
		}
	}

	.search-input-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;

		.search-icon {
			position: absolute;
			left: 12px;
			font-size: 18px;
			color: var(--colors-text-muted, #64748b);
			pointer-events: none;
		}

		.search-input {
			width: 100%;
			height: 40px;
			padding: 0 36px 0 36px;
			border: 1px solid var(--colors-surface-border, #cbd5e1);
			border-radius: 8px;
			font-size: 14px;
			color: var(--colors-text-primary, #0f172a);
			background: var(--colors-surface-card, #ffffff);
			transition:
				border-color 0.2s,
				box-shadow 0.2s;

			&:focus {
				outline: none;
				border-color: var(--colors-brand-primary, #3b82f6);
				box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
			}
		}

		.clear-btn {
			position: absolute;
			right: 10px;
			background: none;
			border: none;
			color: var(--colors-text-muted, #94a3b8);
			cursor: pointer;
			font-size: 16px;
			padding: 4px;
			border-radius: 4px;

			&:hover {
				color: var(--colors-text-primary, #0f172a);
			}
		}
	}

	.btn-locate {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 40px;
		padding: 0 16px;
		background: var(--colors-surface-card, #ffffff);
		border: 1px solid var(--colors-surface-border, #cbd5e1);
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		color: var(--colors-brand-primary, #2563eb);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color 0.2s,
			border-color 0.2s;

		&:hover:not(:disabled) {
			background: #f1f5f9;
			border-color: #94a3b8;
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}

		i {
			font-size: 16px;
		}
	}

	.readonly-location-display {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: var(--colors-surface-background, #f8fafc);
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		color: var(--colors-text-primary, #1e293b);

		.text-primary {
			color: var(--colors-brand-primary, #2563eb);
			font-size: 18px;
		}
	}

	.map-wrapper {
		position: relative;
		width: 100%;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--colors-surface-border, #e2e8f0);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);

		.map-element {
			width: 100%;
			height: 100%;
		}

		.map-overlay {
			position: absolute;
			inset: 0;
			background: rgba(255, 255, 255, 0.85);
			backdrop-filter: blur(2px);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 10px;
			color: var(--colors-text-muted, #64748b);
			font-size: 14px;

			.spinner-icon {
				font-size: 32px;
				color: var(--colors-brand-primary, #2563eb);
			}

			&--error {
				background: #fff5f5;
				color: #c53030;
				padding: 16px;
				text-align: center;

				.error-icon {
					font-size: 36px;
					color: #e53e3e;
				}

				.error-msg {
					font-weight: 600;
					font-size: 14px;
					margin: 0;
				}

				.error-hint {
					font-size: 12px;
					color: #718096;
				}
			}
		}
	}

	.map-hint {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--colors-text-muted, #64748b);
		padding: 2px 4px;

		i {
			font-size: 14px;
			color: var(--colors-brand-primary, #2563eb);
		}
	}

	.coords-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
		font-size: 12px;
		padding: 8px 12px;
		background: var(--colors-surface-background, #f8fafc);
		border-radius: 6px;
		border: 1px solid var(--colors-surface-border, #f1f5f9);

		.coord-field {
			display: flex;
			align-items: center;
			gap: 6px;

			label {
				font-weight: 500;
				color: var(--colors-text-secondary, #475569);
			}

			input {
				width: 110px;
				padding: 4px 8px;
				font-size: 12px;
				border: 1px solid var(--colors-surface-border, #cbd5e1);
				border-radius: 4px;
				background: var(--colors-surface-card, #ffffff);

				&:focus {
					outline: none;
					border-color: var(--colors-brand-primary, #2563eb);
				}
			}
		}

		.coord-hint {
			display: flex;
			align-items: center;
			gap: 4px;
			color: var(--colors-text-muted, #64748b);
			margin-left: auto;

			i {
				font-size: 14px;
			}

			@media (max-width: 640px) {
				margin-left: 0;
				width: 100%;
			}
		}

		&--readonly {
			justify-content: flex-start;
			gap: 8px;

			.coord-tag {
				background: #e2e8f0;
				color: #334155;
				padding: 2px 8px;
				border-radius: 4px;
				font-family: monospace;
				font-size: 12px;
			}
		}
	}
}
</style>
