<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, markRaw } from "vue";
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
const searchWrapper = ref<HTMLDivElement | null>(null);

const addressText = ref(props.location || "");
const latVal = ref<number>(props.latitude || 0);
const lngVal = ref<number>(props.longitude || 0);

const isLoading = ref(true);
const mapError = ref("");
const isLocating = ref(false);

// Autocomplete (Data API) state
const suggestions = ref<any[]>([]);
const showSuggestions = ref(false);
const activeSuggestionIndex = ref(-1);

let mapInstance: any = null;
let markerInstance: any = null; // AdvancedMarkerElement
let geocoderInstance: any = null;

let AutocompleteSuggestionLib: any = null;
let AutocompleteSessionTokenLib: any = null;
let sessionToken: any = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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

watch(
	() => props.readonly,
	(readonly) => {
		if (markerInstance) markerInstance.gmpDraggable = !readonly;
		if (!readonly) void initializeAutocomplete();
		else closeSuggestions();
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

		// Explicitly import the "maps" and "geocoding" libraries instead of reading
		// google.maps.Map / google.maps.Geocoder directly. window.google.maps can exist as a
		// namespace stub slightly before the actual classes finish attaching to it, which is
		// what causes "google.maps.Map is not a constructor". importLibrary() awaits the real
		// thing and is a safe no-op if the library is already loaded.
		const { Map } = await google.maps.importLibrary("maps");
		const { Geocoder } = await google.maps.importLibrary("geocoding");

		mapInstance = new Map(mapContainer.value, {
			center: initialCenter,
			zoom: zoomLevel,
			// mapId is REQUIRED to use AdvancedMarkerElement. Set VITE_GOOGLE_MAPS_MAP_ID in your .env
			// (create one in Google Cloud Console > Maps > Map Management). DEMO_MAP_ID works for testing.
			mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
			mapTypeControl: true,
			streetViewControl: false,
			fullscreenControl: true,
			zoomControl: true,
		});

		geocoderInstance = new Geocoder();

		// Advanced Marker (replaces deprecated google.maps.Marker)
		const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

		markerInstance = new AdvancedMarkerElement({
			map: mapInstance,
			position: initialCenter,
			gmpDraggable: !props.readonly,
			title: "Selected Location",
		});

		// Keep the listeners attached when the same component switches between View and Edit.
		mapInstance.addListener("click", (e: any) => {
			if (props.readonly) return;
			const clickLat = e.latLng.lat();
			const clickLng = e.latLng.lng();
			setMarkerPosition(clickLat, clickLng, true);
		});

		markerInstance.addListener("dragend", () => {
			if (props.readonly) return;
			const pos = markerInstance.position;
			const dragLat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
			const dragLng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
			setMarkerPosition(dragLat, dragLng, true);
		});

		if (!props.readonly) await initializeAutocomplete();

		isLoading.value = false;
	} catch (err: any) {
		console.error("Google Maps Error:", err);
		isLoading.value = false;
		mapError.value = err.message || "Failed to initialize Google Maps.";
	}
}

async function initializeAutocomplete() {
	if (AutocompleteSuggestionLib) return;
	const google = await loadGoogleMapsScript();
	const { AutocompleteSuggestion, AutocompleteSessionToken } =
		await google.maps.importLibrary("places");
	AutocompleteSuggestionLib = AutocompleteSuggestion;
	AutocompleteSessionTokenLib = AutocompleteSessionToken;
	sessionToken = new AutocompleteSessionToken();
}

function setMarkerPosition(lat: number, lng: number, reverseGeocode = false) {
	if (!markerInstance || !mapInstance) return;

	const pos = { lat, lng };
	markerInstance.position = pos; // AdvancedMarkerElement: no more setPosition()
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
		markerInstance.position = pos;
		mapInstance.panTo(pos);
	}
}

function searchAddressManual() {
	// Fallback: user typed a full address and hit Enter without picking a suggestion
	if (props.readonly || !geocoderInstance || !addressText.value.trim()) return;

	closeSuggestions();
	geocoderInstance.geocode({ address: addressText.value }, (results: any[], status: string) => {
		if (status === "OK" && results[0] && results[0].geometry) {
			const loc = results[0].geometry.location;
			const lat = loc.lat();
			const lng = loc.lng();

			mapInstance.setCenter({ lat, lng });
			mapInstance.setZoom(16);
			markerInstance.position = { lat, lng };

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
	activeSuggestionIndex.value = -1;

	if (debounceTimer) clearTimeout(debounceTimer);

	const query = target.value.trim();
	if (!query || !AutocompleteSuggestionLib) {
		suggestions.value = [];
		showSuggestions.value = false;
		return;
	}

	debounceTimer = setTimeout(async () => {
		try {
			const { suggestions: results } =
				await AutocompleteSuggestionLib.fetchAutocompleteSuggestions({
					input: query,
					sessionToken,
				});
			// markRaw: these are live Google SDK instances, not plain data. Letting Vue wrap them
			// in a reactive Proxy causes their placePrediction getter to behave inconsistently
			// (works once, then reads back as null) -> "Cannot read properties of null (reading 'placeId')".
			suggestions.value = results
				.filter((s: any) => s.placePrediction)
				.map((s: any) => markRaw(s));
			showSuggestions.value = suggestions.value.length > 0;
		} catch (err) {
			console.error("Autocomplete suggestion error:", err);
			suggestions.value = [];
			showSuggestions.value = false;
		}
	}, 300);
}

async function selectSuggestion(suggestion: any) {
	if (!suggestion?.placePrediction) return;

	try {
		const place = suggestion.placePrediction.toPlace();
		await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });

		const lat = place.location.lat();
		const lng = place.location.lng();
		const formattedAddress = place.formattedAddress || place.displayName || addressText.value;

		mapInstance.setCenter({ lat, lng });
		mapInstance.setZoom(16);
		markerInstance.position = { lat, lng };

		emitChanges(formattedAddress, lat, lng);
	} finally {
		closeSuggestions();
		// Start a fresh session now that this search+select cycle is done (billing best practice)
		if (AutocompleteSessionTokenLib) {
			sessionToken = new AutocompleteSessionTokenLib();
		}
	}
}

function closeSuggestions() {
	suggestions.value = [];
	showSuggestions.value = false;
	activeSuggestionIndex.value = -1;
}

function onSearchKeydown(e: KeyboardEvent) {
	if (!showSuggestions.value || suggestions.value.length === 0) return;

	if (e.key === "ArrowDown") {
		e.preventDefault();
		activeSuggestionIndex.value = (activeSuggestionIndex.value + 1) % suggestions.value.length;
	} else if (e.key === "ArrowUp") {
		e.preventDefault();
		activeSuggestionIndex.value =
			(activeSuggestionIndex.value - 1 + suggestions.value.length) % suggestions.value.length;
	} else if (e.key === "Escape") {
		closeSuggestions();
	}
}

function onEnterPress() {
	if (showSuggestions.value && activeSuggestionIndex.value >= 0) {
		selectSuggestion(suggestions.value[activeSuggestionIndex.value]);
	} else {
		searchAddressManual();
	}
}

function onCoordInput() {
	emitChanges(addressText.value, latVal.value || 0, lngVal.value || 0);
	updateMapFromCoordinates();
}

function onClickOutside(e: MouseEvent) {
	if (searchWrapper.value && !searchWrapper.value.contains(e.target as Node)) {
		closeSuggestions();
	}
}

onMounted(() => {
	initMap();
	document.addEventListener("click", onClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("click", onClickOutside);
	if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
	<div class="google-map-picker">
		<!-- Search & Controls (Editable Mode) -->
		<div v-if="!readonly" class="map-controls">
			<div class="search-bar-row">
				<div ref="searchWrapper" class="search-input-wrapper">
					<i class="mdi mdi-map-marker-outline search-icon"></i>
					<input
						ref="searchInput"
						type="text"
						class="search-input"
						:value="addressText"
						:placeholder="placeholder"
						autocomplete="off"
						@input="onAddressInput"
						@keydown="onSearchKeydown"
						@keydown.enter.prevent="onEnterPress"
						@focus="() => (showSuggestions = suggestions.length > 0)"
					/>
					<button
						v-if="addressText"
						type="button"
						class="clear-btn"
						title="Clear input"
						@click="
							emitChanges('', 0, 0);
							closeSuggestions();
						"
					>
						<i class="mdi mdi-close"></i>
					</button>

					<!-- Custom-styled suggestion dropdown (Autocomplete Data API, no Google widget/shadow DOM) -->
					<ul v-if="showSuggestions" class="suggestion-list">
						<li
							v-for="(s, idx) in suggestions"
							:key="s.placePrediction.placeId"
							class="suggestion-item"
							:class="{ 'suggestion-item--active': idx === activeSuggestionIndex }"
							@mousedown.prevent="selectSuggestion(s)"
							@mouseenter="activeSuggestionIndex = idx"
						>
							<i class="mdi mdi-map-marker-outline"></i>
							<span>{{ s.placePrediction.text.text }}</span>
						</li>
					</ul>
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
@use "@/styles/components/_google-map-picker.scss";
</style>
