<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Badge from "@/components/Badge.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";
import Textbox from "@/components/Textbox.vue";
import Select from "@/components/Select.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import { useSnackbarStore } from "@/stores/snackbar.store";
import { LHDN_COUNTRIES, LHDN_STATES } from "@/utils/lhdn-countries";

const snackbar = useSnackbarStore();

interface SubNode {
	code: string;
	name: string;
	isActive: boolean;
}

interface CountryModel {
	name: string;
	alpha2Code: string;
	alpha3Code: string;
	numericCode: string;
	isActive: boolean;
	subNodes: SubNode[];
}

const LHDN_COUNTRIES_URL = "https://sdk.myinvois.hasil.gov.my/files/CountryCodes.json";
const LHDN_STATES_URL = "https://sdk.myinvois.hasil.gov.my/files/StateCodes.json";

const viewMode = ref<"card" | "table">("card");
const searchString = ref("");
const filterStatus = ref("all");
const filterRegion = ref("all");
const isDrawerOpen = ref(false);
const isSyncing = ref(false);
const selectedCountry = ref<CountryModel | null>(null);

function resetFilters() {
	searchString.value = "";
	filterStatus.value = "all";
	filterRegion.value = "all";
}

import { useAuthStore } from "@/stores/auth.store";
import http from "@/utils/http";

const authStore = useAuthStore();

const mysStates = ref<SubNode[]>(
	LHDN_STATES.map((s) => ({ code: s.Code, name: s.State, isActive: true }))
);
const countries = ref<CountryModel[]>(parseCountryList(LHDN_COUNTRIES));

const countryHeaders: TableHeader[] = [
	{ key: "name", label: "Country Name", width: "auto", minWidth: "200px" },
	{ key: "alpha3", label: "Alpha-3 Code", width: "150px", minWidth: "120px" },
	{ key: "status", label: "Status", width: "130px", minWidth: "110px" },
	{ key: "actions", label: "Details", align: "right", width: "140px", minWidth: "120px" },
];

function formatCountryName(str: string): string {
	if (!str) return "";
	return str
		.toLowerCase()
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function parseCountryList(items: any[]): CountryModel[] {
	return items.map((item: any) => {
		const code = item.alpha3Code || item.code || item.Code || "";
		const name = item.name || item.Country || "";
		return {
			name: formatCountryName(name),
			alpha2Code: item.alpha2Code || (code ? code.substring(0, 2) : ""),
			alpha3Code: code,
			numericCode: item.numericCode || "000",
			isActive: item.isActive ?? true,
			subNodes: code === "MYS"
				? mysStates.value
				: [{ code: "17", name: "Not Applicable", isActive: true }],
		};
	});
}

async function fetchDirectFromLhdn() {
	try {
		const [cRes, sRes] = await Promise.all([
			fetch(LHDN_COUNTRIES_URL),
			fetch(LHDN_STATES_URL).catch(() => null),
		]);

		if (sRes && sRes.ok) {
			const sJson = await sRes.json();
			if (Array.isArray(sJson) && sJson.length > 0) {
				mysStates.value = sJson.map((st: any) => ({
					code: st.Code,
					name: st.State,
					isActive: true,
				}));
			}
		}

		if (cRes && cRes.ok) {
			const cJson = await cRes.json();
			if (Array.isArray(cJson) && cJson.length > 0) {
				countries.value = parseCountryList(cJson);
			}
		}
	} catch (e) {
		console.warn("Direct LHDN fetch fallback failed:", e);
	}
}

async function loadCountries() {
	isSyncing.value = true;
	try {
		// Pass pageSize: 1000 to retrieve ALL countries from backend DB
		const res = await http.get("/locations/countries", { params: { pageSize: 1000 } });
		const rawData = res?.data?.data || res?.data?.items || res?.data || [];
		const items = Array.isArray(rawData) ? rawData : (rawData.data || rawData.items || []);

		if (Array.isArray(items) && items.length > 0) {
			countries.value = parseCountryList(items);
			return;
		}

		// DB is empty — auto-trigger sync silently on page load
		await http.post("/locations/sync").catch(() => null);
		const res2 = await http.get("/locations/countries", { params: { pageSize: 1000 } });
		const rawData2 = res2?.data?.data || res2?.data?.items || res2?.data || [];
		const items2 = Array.isArray(rawData2) ? rawData2 : (rawData2.data || rawData2.items || []);

		if (Array.isArray(items2) && items2.length > 0) {
			countries.value = parseCountryList(items2);
			return;
		}

		// Fallback to local LHDN reference seed
		countries.value = parseCountryList(LHDN_COUNTRIES);
	} catch (e) {
		console.warn("Location API error, falling back to LHDN seed:", e);
		countries.value = parseCountryList(LHDN_COUNTRIES);
	} finally {
		isSyncing.value = false;
	}
}

onMounted(() => {
	loadCountries();
});

const filteredCountries = computed(() => {
	let result = countries.value.filter((c) => {
		const search = searchString.value.toLowerCase().trim();
		const matchesSearch =
			!search ||
			c.name.toLowerCase().includes(search) ||
			c.alpha3Code.toLowerCase().includes(search) ||
			c.subNodes.some((st) => st.name.toLowerCase().includes(search) || st.code.toLowerCase().includes(search));

		const matchesStatus =
			filterStatus.value === "all" ||
			(filterStatus.value === "active" ? c.isActive : !c.isActive);

		const matchesRegion =
			filterRegion.value === "all" ||
			(filterRegion.value === "mys" ? c.alpha3Code === "MYS" : c.alpha3Code !== "MYS");

		return matchesSearch && matchesStatus && matchesRegion;
	});

	result.sort((a, b) => {
		if (a.alpha3Code === "MYS") return -1;
		if (b.alpha3Code === "MYS") return 1;
		return a.name.localeCompare(b.name);
	});

	return result;
});

const groupedCountries = computed(() => {
	const result: Record<string, CountryModel[]> = {};

	const mys = filteredCountries.value.find((c) => c.alpha3Code === "MYS");
	const others = filteredCountries.value.filter((c) => c.alpha3Code !== "MYS");

	others.sort((a, b) => a.name.localeCompare(b.name));

	others.forEach((c) => {
		const letter = c.name[0]?.toUpperCase() || "A";
		if (!result[letter]) result[letter] = [];
		result[letter].push(c);
	});

	if (mys) {
		const mLetter = "M";
		if (!result[mLetter]) result[mLetter] = [];
		result[mLetter] = [mys, ...result[mLetter].filter((c) => c.alpha3Code !== "MYS")];
	}

	return result;
});

async function openDetails(country: CountryModel) {
	selectedCountry.value = country;
	isDrawerOpen.value = true;
	if (country.alpha3Code) {
		try {
			const res = await http.get("/locations/states", { params: { countryCode: country.alpha3Code } });
			const statesData = res.data?.data || res.data?.items || res.data || [];
			if (Array.isArray(statesData) && statesData.length > 0) {
				country.subNodes = statesData.map((s: any) => ({
					code: s.code || s.stateCode || "",
					name: s.name || s.stateName || "",
					isActive: s.isActive ?? true,
				}));
			}
		} catch (e) {
			console.warn("Failed to load states for country", country.alpha3Code, e);
		}
	}
}

async function syncWithLhdn() {
	isSyncing.value = true;
	try {
		const res = await http.post("/locations/sync");
		await loadCountries();
		const synced = (res as any)?.data?.synced || res?.data?.synced;
		if (synced && typeof synced.countries === "number") {
			snackbar.success(`Synced ${synced.countries} countries & ${synced.states} states from LHDN MyInvois.`);
		} else {
			snackbar.success(`Successfully synchronized ${countries.value.length} LHDN country codes!`);
		}
	} catch (e) {
		console.warn("Sync via API failed, falling back to direct LHDN fetch:", e);
		try {
			await fetchDirectFromLhdn();
			snackbar.warning(`Synced ${countries.value.length} countries directly from LHDN SDK.`);
		} catch (e2) {
			snackbar.error("Sync failed. Please check your network connection and try again.");
		}
	} finally {
		isSyncing.value = false;
	}
}
</script>

<template>
	<div class="maintenance-view">
		<div class="page-header">
			<div class="page-header__title-area">
				<div class="title-with-badge">
					<h1>Global Locations</h1>
					<Badge type="info" icon="mdi-public">{{ countries.length }} LHDN Countries</Badge>
				</div>
				<p class="page-header__subtitle">
					Official LHDN MyInvois Standard Country & State Reference Specifications
				</p>
			</div>
			<button v-if="authStore.can('manage', 'Location')" class="btn btn--primary sync-btn" :disabled="isSyncing" @click="syncWithLhdn">
				<i class="mdi" :class="isSyncing ? 'mdi-loading mdi-spin' : 'mdi-sync'"></i>
				<span class="btn-text">{{ isSyncing ? 'Syncing SDK...' : 'Sync LHDN Codes' }}</span>
			</button>
		</div>

		<div class="filter-panel">
			<div class="filter-panel__left">
				<Textbox
					v-model="searchString"
					placeholder="Search Countries, ISO codes, or states (e.g. MYS, Malaysia, Selangor)..."
					style="flex: 1;"
					hide-footer
				>
					<template #prefix>
						<i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 6px;"></i>
					</template>
				</Textbox>
				<FilterPanel show-reset align="right" @reset="resetFilters">
					<Select v-model="filterStatus" label="Status">
						<option value="all">All Status</option>
						<option value="active">Active Only</option>
						<option value="inactive">Inactive Only</option>
					</Select>
					<Select v-model="filterRegion" label="Region">
						<option value="all">All Regions</option>
						<option value="mys">Malaysia Only (MYS)</option>
						<option value="international">International</option>
					</Select>
				</FilterPanel>
			</div>

			<div class="view-toggle">
				<button
					class="view-toggle__btn"
					:class="{ 'view-toggle__btn--active': viewMode === 'card' }"
					@click="viewMode = 'card'"
					title="Card View"
				>
					<i class="mdi mdi-grid"></i>
				</button>
				<button
					class="view-toggle__btn"
					:class="{ 'view-toggle__btn--active': viewMode === 'table' }"
					@click="viewMode = 'table'"
					title="Table View"
				>
					<i class="mdi mdi-format-list-bulleted"></i>
				</button>
			</div>
		</div>

		<div v-if="viewMode === 'card'" class="layout-groups">
			<div v-for="(group, key) in groupedCountries" :key="key" class="group-section">
				<h2 class="group-section__title">{{ key }}</h2>

				<div class="country-grid">
					<div
						v-for="(country, idx) in group"
						:key="`${country.alpha3Code}-${idx}`"
						class="country-card"
						@click="openDetails(country)"
					>
						<div class="country-card__body">
							<div class="country-card__info">
								<div class="country-card__name-row">
									<h3>{{ country.name }}</h3>
									<i
										v-if="country.alpha3Code === 'MYS'"
										class="mdi mdi-star country-card__star"
										title="Base Country"
									></i>
								</div>
								<span class="country-card__meta">
									Code: {{ country.alpha3Code }}
								</span>
							</div>
							<Badge :type="country.isActive ? 'success' : 'error'" size="sm">
								{{ country.isActive ? 'Active' : 'Inactive' }}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div v-else>
			<Card>
				<Table
					paginate
					storageKey="location-maintenance"
					:headers="countryHeaders"
					:items="filteredCountries"
					:loading="isSyncing"
					emptyMessage="No countries found matching your search."
				>
					<template #item-name="{ item }">
						<div style="display: flex; align-items: center; gap: 6px;">
							<strong style="font-weight: 600">{{ item.name }}</strong>
							<i v-if="item.alpha3Code === 'MYS'" class="mdi mdi-star" style="color: #f59e0b;" title="Base Country"></i>
						</div>
					</template>
					<template #item-alpha3="{ item }">
						<span class="u-font-mono">{{ item.alpha3Code }}</span>
					</template>
					<template #item-status="{ item }">
						<Badge :type="item.isActive ? 'success' : 'error'">
							{{ item.isActive ? 'Active' : 'Inactive' }}
						</Badge>
					</template>
					<template #item-actions="{ item }">
						<button
							class="btn btn--outlined"
							@click="openDetails(item)"
						>
							View States
						</button>
					</template>
				</Table>
			</Card>
		</div>

		<Dialog v-model="isDrawerOpen">
			<template #header>
				<h2>{{ selectedCountry?.name }}</h2>
				<p>Standard LHDN State & Region Specifications</p>
			</template>

			<div class="country-detail-header">
				<div class="detail-badge-group">
					<Badge type="info">LHDN Code: {{ selectedCountry?.alpha3Code }}</Badge>
					<Badge type="success">Active</Badge>
				</div>
			</div>

			<div v-if="selectedCountry?.alpha3Code === 'MYS'" class="alert alert--info mt-sm">
				<i class="mdi mdi-information"></i>
				<div class="alert__content">
					<strong>Malaysia Standard State Codes:</strong> Mandatory 16 state codes synced according to LHDN MyInvois specification.
				</div>
			</div>

			<div class="drawer-box__sub-title-row" style="margin-top: 16px;">
				<h3 style="font-size: 15px; font-weight: 600; margin: 0">
					States / Regions ({{ selectedCountry?.subNodes?.length || 0 }})
				</h3>
			</div>

			<div class="sub-list" style="max-height: 400px; overflow-y: auto">
				<div
					v-for="(sub, index) in selectedCountry?.subNodes"
					:key="index"
					class="sub-card"
				>
					<div class="sub-card__left">
						<span class="sub-card__name">{{ sub.name }}</span>
						<span class="sub-card__code">LHDN Code: {{ sub.code || "N/A" }}</span>
					</div>

					<div class="sub-card__right">
						<Badge type="success" size="sm">Active</Badge>
					</div>
				</div>
			</div>

			<template #footer>
				<button class="btn btn--secondary" @click="isDrawerOpen = false">
					Close
				</button>
			</template>
		</Dialog>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/pages/Maintenance/_location.scss";
</style>
