<template>
    <div class="location-view">
        <div class="location-view__header">
            <div class="location-view__title-area">
                <h1>Global Locations</h1>
                <p class="location-view__subtitle">Official LHDN MyInvois Country & State Standards</p>
            </div>
            <div class="location-view__actions">
                <Chip type="info" icon="mdi-public">{{ countries.length }} Countries</Chip>
                <button class="action-btn action-btn--primary" @click="syncWithLhdn">
                    <i class="mdi mdi-sync"></i> Sync SDK Codes
                </button>
            </div>
        </div>

        <div class="filter-panel">
            <div class="filter-panel__left">
                <div class="search-box">
                    <i class="mdi mdi-magnify search-box__icon"></i>
                    <input 
                        v-model="searchString" 
                        type="text" 
                        placeholder="Search Country or Code (e.g. MYS, Malaysia)..." 
                        class="search-box__input"
                    />
                </div>
                <label class="checkbox-container">
                    <input type="checkbox" v-model="showActiveOnly" />
                    <span class="checkbox-container__box"></span>
                    Show Active Only
                </label>
            </div>
            
            <div class="view-toggle">
                <button 
                    class="view-toggle__btn" 
                    :class="{ 'view-toggle__btn--active': viewMode === 'card' }"
                    @click="viewMode = 'card'"
                >
                    <i class="mdi mdi-grid"></i>
                </button>
                <button 
                    class="view-toggle__btn" 
                    :class="{ 'view-toggle__btn--active': viewMode === 'table' }"
                    @click="viewMode = 'table'"
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
                        v-for="country in group" 
                        :key="country.alpha3Code"
                        class="country-card"
                        :style="getCountryCardStyle(country)"
                        @click="openManagement(country)"
                    >
                        <div class="country-card__body">
                            <div class="country-card__info">
                                <div class="country-card__name-row">
                                    <h3>{{ country.name }}</h3>
                                    <i v-if="country.alpha3Code === 'MYS'" class="mdi mdi-star country-card__star" title="Mandatory Base Country"></i>
                                </div>
                                <span class="country-card__meta">
                                    {{ country.alpha3Code }} | {{ country.numericCode }}
                                </span>
                            </div>
                            <button class="icon-action-btn" @click.stop="openManagement(country)">
                                <i class="mdi mdi-cog-outline"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else>
            <Card>
                <Table :headers="countryHeaders" :items="filteredCountries" emptyMessage="No countries found matching your search.">
                    <template #item-name="{ item }">
                        <strong style="font-weight: 600;">{{ item.name }}</strong>
                    </template>
                    <template #item-alpha3="{ item }">
                        <span class="u-font-mono">{{ item.alpha3Code }}</span>
                    </template>
                    <template #item-numeric="{ item }">
                        {{ item.numericCode }}
                    </template>
                    <template #item-status="{ item }">
                        <label class="switch-toggle">
                            <input type="checkbox" v-model="item.isActive" />
                            <span class="switch-toggle__slider"></span>
                        </label>
                    </template>
                    <template #item-actions="{ item }">
                        <button class="action-btn action-btn--outlined action-btn--sm" @click="openManagement(item)">
                            Manage
                        </button>
                    </template>
                </Table>
            </Card>
        </div>

        <Dialog v-model="isDrawerOpen">
            <template #header>
                <h2>{{ selectedCountry?.name }}</h2>
                <p>Standard LHDN Codes Management</p>
            </template>

            <div v-if="selectedCountry?.alpha3Code === 'MYS'" class="alert alert--warning">
                <i class="mdi mdi-alert-circle"></i>
                <div class="alert__content">
                    <strong>Malaysia (MYS) Detected:</strong> These 16 state codes are strictly mandatory for MyInvois validation. Delete is forbidden.
                </div>
            </div>

            <div class="drawer-box__sub-title-row" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 15px; font-weight: 600; margin: 0;">States / Regions ({{ selectedCountry?.subNodes.length }})</h3>
                <button 
                    v-if="selectedCountry?.alpha3Code !== 'MYS'" 
                    class="action-btn action-btn--outlined action-btn--sm" 
                    @click="addSubNode"
                >
                    <i class="mdi mdi-plus"></i> Add New
                </button>
            </div>

            <div class="sub-list" style="max-height: 400px; overflow-y: auto;">
                <div v-for="(sub, index) in selectedCountry?.subNodes" :key="index" class="sub-card">
                    <div class="sub-card__left">
                        <span class="sub-card__name">{{ sub.name }}</span>
                        <span class="sub-card__code">LHDN Code: {{ sub.code || 'N/A' }}</span>
                    </div>
                    
                    <div class="sub-card__right">
                        <label class="switch-toggle">
                            <input type="checkbox" v-model="sub.isActive" />
                            <span class="switch-toggle__slider"></span>
                        </label>
                        <button 
                            v-if="selectedCountry?.alpha3Code !== 'MYS'" 
                            class="sub-card__delete-btn"
                            @click="removeSubNode(index)"
                        >
                            <i class="mdi mdi-delete-outline"></i>
                        </button>
                    </div>
                </div>
            </div>

            <template #footer>
                <button class="action-btn action-btn--text" @click="isDrawerOpen = false">Close</button>
                <button class="action-btn action-btn--primary" @click="saveChanges">Save Changes</button>
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Chip from "@/components/Chip.vue";
import Table from "@/components/Table.vue";
import type { TableHeader } from "@/components/Table.vue";
import Dialog from "@/components/Dialog.vue";
import Card from "@/components/Card.vue";

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

const viewMode = ref<"card" | "table">("card");
const searchString = ref("");
const showActiveOnly = ref(false);
const isDrawerOpen = ref(false);
const selectedCountry = ref<CountryModel | null>(null);

const countries = ref<CountryModel[]>([]);

const countryHeaders: TableHeader[] = [
    { key: "name", label: "Name" },
    { key: "alpha3", label: "Alpha-3" },
    { key: "numeric", label: "Numeric" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", align: "right" }
];

// 🌟 初始化大厂电子发票合规基础数据
function initializeData() {
    // 1. 马来西亚内定 16 个 LHDN 映射细分州
    const mys: CountryModel = {
        name: "Malaysia", alpha2Code: "MY", alpha3Code: "MYS", numericCode: "458", isActive: true,
        subNodes: [
            { code: "01", name: "Johor", isActive: true },
            { code: "02", name: "Kedah", isActive: true },
            { code: "03", name: "Kelantan", isActive: true },
            { code: "04", name: "Melaka", isActive: true },
            { code: "05", name: "Negeri Sembilan", isActive: true },
            { code: "06", name: "Pahang", isActive: true },
            { code: "07", name: "Pulau Pinang", isActive: true },
            { code: "08", name: "Perak", isActive: true },
            { code: "09", name: "Perlis", isActive: true },
            { code: "10", name: "Selangor", isActive: true },
            { code: "11", name: "Terengganu", isActive: true },
            { code: "12", name: "Sabah", isActive: true },
            { code: "13", name: "Sarawak", isActive: true },
            { code: "14", name: "W.P. Kuala Lumpur", isActive: true },
            { code: "15", name: "W.P. Labuan", isActive: true },
            { code: "16", name: "W.P. Putrajaya", isActive: true }
        ]
    };

    // 2. 海外国家：按照商业降维设计，默认配好 "00" - Other State 兜底
    const createForeignCountry = (name: string, a2: string, a3: string, num: string): CountryModel => ({
        name, alpha2Code: a2, alpha3Code: a3, numericCode: num, isActive: true,
        subNodes: [{ code: "00", name: "Other State / Overseas Region", isActive: true }]
    });

    countries.value = [
        mys,
        createForeignCountry("Singapore", "SG", "SGP", "702"),
        createForeignCountry("United Kingdom", "GB", "GBR", "826"),
        createForeignCountry("United States", "US", "USA", "840"),
        createForeignCountry("China", "CN", "CHN", "156"),
        createForeignCountry("Australia", "AU", "AUS", "036"),
        createForeignCountry("Brunei Darussalam", "BN", "BRN", "096"),
        createForeignCountry("Indonesia", "ID", "IDN", "360"),
        createForeignCountry("Thailand", "TH", "THA", "764"),
        createForeignCountry("Japan", "JP", "JPN", "392")
    ];
}

initializeData();

// 核心多重计算过滤流
const filteredCountries = computed(() => {
    let result = countries.value.filter(c => {
        const matchesSearch = !searchString.value || 
            c.name.toLowerCase().includes(searchString.value.toLowerCase()) ||
            c.alpha3Code.toLowerCase().includes(searchString.value.toLowerCase());
        const matchesActive = !showActiveOnly.value || c.isActive;
        return matchesSearch && matchesActive;
    });

    if (viewMode.value === 'table') {
        result.sort((a, b) => {
            if (a.alpha3Code === 'MYS') return -1;
            if (b.alpha3Code === 'MYS') return 1;
            return a.name.localeCompare(b.name);
        });
    }

    return result;
});

// 字母表动态分组算法 (A -> [...], B -> [...])
const groupedCountries = computed(() => {
    const sorted = [...filteredCountries.value].sort((a, b) => a.name.localeCompare(b.name));
    const groups: Record<string, CountryModel[]> = {};
    
    sorted.forEach(c => {
        const firstLetter = c.name[0].toUpperCase();
        if (!groups[firstLetter]) groups[firstLetter] = [];
        groups[firstLetter].push(c);
    });
    return groups;
});

function getCountryCardStyle(country: CountryModel) {
    if (!country.isActive) {
        return { borderLeft: "5px solid var(--colors-surface-border)", opacity: 0.5 };
    }
    return { borderLeft: "5px solid var(--colors-brand-primary)" };
}

function openManagement(country: CountryModel) {
    // 采用深拷贝隔离数据暂存
    selectedCountry.value = JSON.parse(JSON.stringify(country));
    isDrawerOpen.value = true;
}

function addSubNode() {
    selectedCountry.value?.subNodes.push({ code: "", name: "New Overseas Region", isActive: true });
}

function removeSubNode(index: number) {
    selectedCountry.value?.subNodes.splice(index, 1);
}

function saveChanges() {
    if (!selectedCountry.value) return;
    const idx = countries.value.findIndex(c => c.alpha3Code === selectedCountry.value?.alpha3Code);
    if (idx !== -1) {
        countries.value[idx] = JSON.parse(JSON.stringify(selectedCountry.value));
    }
    isDrawerOpen.value = false;
}

function syncWithLhdn() {
    console.log("Triggering Bun backend python/TS SDK crawler sync...");
}
</script>

<style lang="scss" scoped>
@use "@/styles/base/mixins" as *;

.location-view {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-md);
    }

    &__title-area {
        h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px 0; }
        p { font-size: 13px; color: #64748b; margin: 0; }
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }
}

// 2. 过滤检索区
.filter-panel {
    background: var(--colors-surface-card);
    border: 1px solid var(--colors-surface-border);
    border-radius: var(--radius-xxs, 12px);
    padding: var(--spacing-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01);

    &__left {
        display: flex;
        align-items: center;
        gap: var(--spacing-lg);
        flex-grow: 1;
        max-width: 600px;
    }
}

// 视图切换器选择按钮
.view-toggle {
    display: flex;
    background-color: var(--colors-surface-background);
    padding: 3px;
    border-radius: 8px;

    &__btn {
        background: transparent; border: none; padding: 6px 12px;
        border-radius: 6px; color: var(--colors-text-muted); cursor: pointer;
        display: inline-flex; font-size: 16px; transition: all 0.2s;
        
        &:hover { color: var(--colors-text-primary); }
        &--active { background: var(--colors-surface-card); color: var(--colors-brand-primary); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); }
    }
}

// 3. 字母组分类
.group-section {
    margin-bottom: var(--spacing-xl);
    
    &__title {
        font-size: 18px; font-weight: 800; color: var(--colors-text-primary);
        margin: 0 0 var(--spacing-md) 0; border-bottom: 2px solid var(--colors-surface-border); padding-bottom: 4px;
    }
}

// 国家卡片区
.country-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--spacing-md);
}

.country-card {
    background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); border-radius: 10px;
    padding: var(--spacing-md); cursor: pointer; transition: all 0.22s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.01);

    &__body { display: flex; justify-content: space-between; align-items: center; }
    &__info { display: flex; flex-direction: column; gap: 4px; }
    &__name-row { @include flex-row($align: center, $gap: 6px); h3 { font-size: 14px; font-weight: 700; margin: 0; color: var(--colors-text-primary); } }
    &__star { color: #f59e0b; font-size: 14px; }
    &__meta { font-size: 11px; color: var(--colors-text-muted); font-family: monospace; }

    &:hover {
        transform: translateY(-2px);
        border-color: var(--colors-brand-primary) !important;
        box-shadow: 0 6px 18px rgba(80, 88, 242, 0.08);
    }
}



// 内部滚动子列表
.sub-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.sub-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; background-color: var(--colors-surface-hover); border: 1px solid var(--colors-surface-border); border-radius: 8px;
    
    &__left { display: flex; flex-direction: column; gap: 2px; }
    &__name { font-size: 13px; font-weight: 600; color: var(--colors-text-primary); }
    &__code { font-size: 11px; color: var(--colors-text-muted); font-family: monospace; }
    &__right { @include flex-row($align: center, $gap: 12px); }
    &__delete-btn { background: transparent; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; &:hover { color: #ef4444; } }
}

// 警示框组件
.alert {
    display: flex; gap: 10px; padding: 12px var(--spacing-md); border-radius: 8px; font-size: 12px; line-height: 1.5; margin-bottom: 16px;
    &--warning { background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #b45309; i { font-size: 16px; } }
}

// 基础公用表格及原子项
.search-box { position: relative; flex-grow: 1; .search-box__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--colors-text-muted); font-size: 18px; } .search-box__input { width: 100%; padding: 8px 12px 8px 38px; border: 1px solid var(--colors-surface-border); border-radius: 6px; font-size: 13px; background: var(--colors-surface-background); color: var(--colors-text-primary); outline: none; box-sizing: border-box; &:focus { border-color: var(--colors-brand-primary); } } }
.checkbox-container { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; color: var(--colors-text-primary); input { display: none; } &__box { width: 16px; height: 16px; border: 2px solid var(--colors-surface-border); border-radius: 4px; position: relative; transition: all 0.15s; } input:checked + &__box { background-color: var(--colors-brand-primary); border-color: var(--colors-brand-primary); &::after { content: '✓'; position: absolute; color: white; font-size: 11px; font-weight: bold; left: 2px; top: -2px; } } }
.switch-toggle { display: inline-flex; align-items: center; cursor: pointer; input { display: none; } &__slider { width: 34px; height: 18px; background-color: var(--colors-surface-border); border-radius: 20px; position: relative; transition: background-color 0.2s; &::before { content: ''; position: absolute; left: 2px; top: 2px; width: 14px; height: 14px; background-color: white; border-radius: 50%; transition: transform 0.2s; } } input:checked + &__slider { background-color: #22c55e; &::before { transform: translateX(16px); } } }
.filter-dropdown { padding: 8px var(--spacing-sm); border: 1px solid var(--colors-surface-border); border-radius: 6px; font-size: 13px; color: var(--colors-text-primary); background-color: var(--colors-surface-card); outline: none; cursor: pointer; }
.action-btn { border: none; border-radius: 6px; font-size: 13px; font-weight: 600; padding: 8px 16px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; &--primary { background-color: var(--colors-brand-primary); color: white; &:hover { opacity: 0.9; } } &--outlined { background-color: transparent; border: 1px solid var(--colors-brand-primary); color: var(--colors-brand-primary); &:hover { background-color: rgba(99, 102, 241, 0.05); } } &--text { background: transparent; color: var(--colors-text-muted); &:hover { background: var(--colors-surface-hover); } } &--sm { padding: 5px 12px; font-size: 12px; } }
.icon-action-btn { background: transparent; border: none; font-size: 16px; color: var(--colors-text-secondary); padding: 6px; cursor: pointer; border-radius: 6px; &:hover { background-color: var(--colors-surface-hover); color: var(--colors-brand-primary); } }
.u-text-right { text-align: right !important; }
.u-font-mono { font-family: monospace; font-weight: 600; }


</style>