<template>
    <div class="maintenance-view">
        <div class="maintenance-view__header">
            <div class="maintenance-view__title-area">
                <h1>Role & Group Permissions</h1>
                <p class="maintenance-view__subtitle">Configure permissions and global authorization policies for user groups</p>
            </div>
            <button 
                class="action-btn action-btn--primary" 
                :disabled="!selectedGroupCode || isSaving" 
                @click="saveGroupPermissions"
            >
                <i class="mdi" :class="isSaving ? 'mdi-loading mdi-spin' : 'mdi-content-save-outline'"></i>
                Save Permissions
            </button>
        </div>

        <div class="maintenance-grid">
            
            <div class="maintenance-grid__left-panel">
                <h2 class="panel-card__title">Select Group / Role</h2>
                
                <div v-if="isLoadingGroups" class="loading-state">
                    <i class="mdi mdi-loading mdi-spin"></i>
                    <span>Loading system roles...</span>
                </div>

                <div v-else class="type-list">
                    <div 
                        v-for="group in groups" 
                        :key="group.code"
                        class="type-card"
                        :class="{ 'type-card--selected': selectedGroupCode === group.code }"
                        @click="handleGroupChange(group.code)"
                    >
                        <div class="type-card__content">
                            <span class="type-card__name">{{ group.name }}</span>
                            <span class="type-card__code">{{ group.description }}</span>
                        </div>
                        <Chip type="info">{{ group.code }}</Chip>
                    </div>
                </div>
            </div>

            <div class="maintenance-grid__right-panel">
                
                <div v-if="!selectedGroupCode" class="empty-state border-dashed">
                    <i class="mdi mdi-shield-lock-outline empty-state__icon"></i>
                    <p>No Role Selected</p>
                    <span class="empty-state__sub">
                        Please select a group or role from the list on the left to manage its authorization policy and system capabilities.
                    </span>
                </div>

                <div v-else-if="isLoadingPermissions" class="empty-state">
                    <i class="mdi mdi-loading mdi-spin empty-state__icon u-text-primary"></i>
                    <p>Fetching Authorized Policies...</p>
                </div>

                <div v-else class="matrix-container">
                    <div class="filter-panel mb-md">
                        <Textbox
                            v-model="searchQuery"
                            placeholder="Search operational permissions..."
                            style="flex-grow: 1;"
                        >
                            <template #prefix>
                                <i class="mdi mdi-magnify" style="font-size: 18px; margin-right: 4px;"></i>
                            </template>
                        </Textbox>
                    </div>

                    <div v-for="(perms, subject) in filteredGroupedPermissions" :key="subject" class="panel-card mb-md">
                        <div class="panel-card__header">
                            <div class="panel-card__header-title">
                                <i class="mdi mdi-folder-key-network-outline u-text-primary"></i>
                                <h2>{{ subject }} Permissions</h2>
                            </div>
                            <div class="panel-card__header-actions">
                                <button class="action-btn action-btn--text action-btn--sm u-text-primary" @click="toggleAllInSubject(String(subject), true)">
                                    Select All
                                </button>
                                <button class="action-btn action-btn--text action-btn--sm" @click="toggleAllInSubject(String(subject), false)">
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div class="permission-item-grid">
                            <div 
                                v-for="perm in perms" 
                                :key="perm.code"
                                class="perm-box"
                                :class="{ 'perm-box--checked': isChecked(perm.code) }"
                                @click="togglePermission(perm.code)"
                            >
                                <label class="checkbox-container" @click.stop>
                                    <input 
                                        type="checkbox" 
                                        :checked="isChecked(perm.code)" 
                                        @change="(e) => onPermissionToggle(perm.code, (e.target as HTMLInputElement).checked)"
                                    />
                                    <span class="checkbox-container__box"></span>
                                    <span class="perm-box__action-label">{{ perm.action }}</span>
                                </label>
                                
                                <span v-if="perm.inverted" class="deny-badge" title="Inverted Policy Rule">
                                    Deny rule
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import Chip from "@/components/Chip.vue";
import Textbox from "@/components/Textbox.vue";

interface UserGroupModel {
    code: string;
    name: string;
    description: string;
}

interface PermissionModel {
    code: string;
    action: string;
    subject: string;
    inverted: boolean;
}

const isLoadingGroups = ref(false);
const isLoadingPermissions = ref(false);
const isSaving = ref(false);

const selectedGroupCode = ref("");
const searchQuery = ref("");

const groups = ref<UserGroupModel[]>([]);
const allPermissions = ref<PermissionModel[]>([]);
// 💡 原生态高履约速度：利用 Set 追踪哈希命中状态，速度比 C# HashSet 还要快！
const selectedPermissionCodes = ref<Set<string>>(new Set());

// 1. 初始化拉取主角色
async function loadGroups() {
    isLoadingGroups.value = true;
    try {
        const response = await fetch("api/user-groups");
        if (response.ok) {
            groups.value = await response.json();
        } else {
            throw new Error();
        }
    } catch {
        // 完美对齐你的 Mock Fallback 数据
        groups.value = [
            { code: "SA", name: "Superadmin", description: "Complete system control" },
            { code: "Administrator", name: "Administrator", description: "Manage users and settings" },
            { code: "Manager", name: "Manager", description: "Manage engineers and schedules" },
            { code: "Engineer", name: "Engineer", description: "Execute work orders" },
            { code: "Sales", name: "Sales", description: "Manage customer requests" }
        ];
    } finally {
        isLoadingGroups.value = false;
    }
}

// 2. 初始化拉取全量系统权限库
async function loadAllPermissions() {
    try {
        const response = await fetch("api/permissions");
        if (response.ok) {
            allPermissions.value = await response.json();
        }
    } catch {
        allPermissions.value = [
            { code: "user_read", subject: "User", action: "read", inverted: false },
            { code: "user_create", subject: "User", action: "create", inverted: false },
            { code: "user_update", subject: "User", action: "update", inverted: false },
            { code: "user_delete", subject: "User", action: "delete", inverted: false },
            { code: "wo_read", subject: "WorkOrder", action: "read", inverted: false },
            { code: "wo_create", subject: "WorkOrder", action: "create", inverted: false },
            { code: "wo_update", subject: "WorkOrder", action: "update", inverted: false },
            { code: "wo_delete", subject: "WorkOrder", action: "delete", inverted: false },
            { code: "customer_read", subject: "Customer", action: "read", inverted: false },
            { code: "customer_create", subject: "Customer", action: "create", inverted: false },
            { code: "customer_update", subject: "Customer", action: "update", inverted: false },
            { code: "report_read", subject: "Report", action: "read", inverted: false }
        ];
    }
}

// 3. 点击左侧角色切换，拉取交叉绑定关系
async function handleGroupChange(groupCode: string) {
    selectedGroupCode.value = groupCode;
    isLoadingPermissions.value = true;
    selectedPermissionCodes.value.clear();
    
    try {
        const response = await fetch(`api/permissions/groups/${groupCode}`);
        if (response.ok) {
            const groupPermissions: PermissionModel[] = await response.json();
            groupPermissions.forEach(p => selectedPermissionCodes.value.add(p.code));
        }
    } catch {
        console.warn(`Simulating empty authorization set for mock-role: ${groupCode}`);
    } finally {
        isLoadingPermissions.value = false;
    }
}

// 4. 多重动态交织过滤加 Subject 归组计算属性 (关键)
const filteredGroupedPermissions = computed(() => {
    const result: Record<string, PermissionModel[]> = {};
    if (!allPermissions.value) return result;

    allPermissions.value.forEach(x => {
        const query = searchQuery.value.toLowerCase();
        const matches = !searchQuery.value ||
            x.subject.toLowerCase().includes(query) ||
            x.action.toLowerCase().includes(query) ||
            x.code.toLowerCase().includes(query);

        if (matches) {
            if (!result[x.subject]) result[x.subject] = [];
            result[x.subject].push(x);
        }
    });
    return result;
});

function isChecked(code: string): boolean {
    return selectedPermissionCodes.value.has(code);
}

function onPermissionToggle(code: string, checked: boolean) {
    if (checked) selectedPermissionCodes.value.add(code);
    else selectedPermissionCodes.value.delete(code);
}

// 💡 交互优化：点按容器整块区域直接触发 Toggle 勾选
function togglePermission(code: string) {
    if (selectedPermissionCodes.value.has(code)) {
        selectedPermissionCodes.value.delete(code);
    } else {
        selectedPermissionCodes.value.add(code);
    }
}

function toggleAllInSubject(subject: string, enable: boolean) {
    const subjectPerms = allPermissions.value.filter(x => x.subject === subject);
    subjectPerms.forEach(p => {
        if (enable) selectedPermissionCodes.value.add(p.code);
        else selectedPermissionCodes.value.delete(p.code);
    });
}

// 5. 数据同步回传
async function saveGroupPermissions() {
    if (!selectedGroupCode.value) return;
    isSaving.value = true;
    
    try {
        const payload = { permission_codes: Array.from(selectedPermissionCodes.value) };
        const response = await fetch(`api/permissions/groups/${selectedGroupCode.value}/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert(`Successfully updated permissions for role "${selectedGroupCode.value}"!`);
        } else {
            const err = await response.text();
            alert(`Error saving group permissions: ${err}`);
        }
    } catch (ex: any) {
        alert(`Operation failed: ${ex.message}`);
    } finally {
        isSaving.value = false;
    }
}

onMounted(() => {
    loadGroups();
    loadAllPermissions();
});
</script>

<style lang="scss" scoped>
@mixin flex-row($align: stretch, $gap: 0) {
    display: flex;
    align-items: $align;
    gap: $gap;
}

.maintenance-view {
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
        h1 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-main); }
        p { font-size: 13px; color: var(--colors-text-muted); margin: 4px 0 0 0; }
    }
}

.maintenance-grid {
    display: grid; grid-template-columns: 4.2fr 7.8fr; gap: var(--spacing-lg); align-items: start;
    @media (max-width: 960px) { grid-template-columns: 1fr; }

    &__left-panel {
        background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); border-radius: 12px;
        padding: var(--spacing-md); height: 600px; display: flex; flex-direction: column; gap: 12px;
        @media (max-width: 960px) { height: auto; max-height: 400px; }
    }
    &__right-panel { 
        min-height: 600px; height: 100%; 
        @media (max-width: 960px) { min-height: auto; }
    }
}

.panel-card__title { font-size: 15px; font-weight: 700; margin: 0 0 8px 0; color: var(--colors-text-primary); }

.type-list { flex-grow: 1; overflow-y: auto; padding-right: 2px; }

.type-card {
    background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); padding: 12px var(--spacing-md);
    border-radius: 10px; cursor: pointer; @include flex-row($align: center, $gap: 12px);
    justify-content: space-between; margin-bottom: 6px; transition: all 0.18s ease;

    &__content { display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
    &__name { font-size: 14px; font-weight: 700; color: var(--colors-text-primary); }
    &__code { font-size: 11px; color: var(--colors-text-muted); }

    &:hover { border-color: var(--colors-brand-primary); background-color: var(--colors-surface-hover); transform: translateY(-1px); }
    &--selected {
        background-color: var(--colors-surface-hover) !important; border-color: var(--colors-brand-primary) !important;
        .type-card__name { color: var(--colors-brand-primary); }
    }
}

.matrix-container { display: flex; flex-direction: column; width: 100%; }

.permission-item-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--spacing-md); padding-top: var(--spacing-sm);
    @media (max-width: 640px) { grid-template-columns: 1fr; }
}

.perm-box {
    border: 1px solid var(--colors-surface-border); background-color: var(--colors-surface-background); padding: 12px var(--spacing-md);
    border-radius: 10px; transition: all 0.2s ease; cursor: pointer;
    @include flex-row($align: center, $gap: 12px); justify-content: space-between;

    &__action-label { font-size: 14px; font-weight: 600; color: var(--colors-text-primary); text-transform: capitalize; }

    &:hover { border-color: var(--colors-brand-primary); }

    &--checked {
        border-color: var(--colors-brand-primary) !important; background-color: var(--colors-surface-hover) !important;
        .perm-box__action-label { color: var(--colors-brand-primary); }
    }
}

.deny-badge {
    background: #fef2f2; color: #ef4444; border: 1px solid #fca5a5;
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
}

// 基础脚手架公用样式
.panel-card { background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); border-radius: 12px; padding: 24px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.01); .panel-card__header-title { @include flex-row($align: center, $gap: 8px); i { font-size: 18px; } h2 { font-size: 15px; font-weight: 700; margin: 0; color: var(--colors-text-primary); } } .panel-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; } }
.filter-panel { background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); border-radius: 12px; padding: var(--spacing-md); display: flex; }
.action-btn { border: none; border-radius: 6px; font-size: 13px; font-weight: 600; padding: 8px 18px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; &--primary { background-color: var(--colors-brand-primary); color: white; &:hover { opacity: 0.9; } &[disabled] { background-color: var(--colors-surface-border) !important; color: var(--colors-text-muted) !important; cursor: not-allowed; box-shadow: none !important; } } &--text { background: transparent; color: var(--colors-text-muted); font-size: 12px; padding: 4px 8px; &:hover { background: var(--colors-surface-hover); } } }
.empty-state { height: 100%; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-xl); background: var(--colors-surface-card); border: 1px solid var(--colors-surface-border); border-radius: 12px; color: var(--colors-text-muted); text-align: center; &__icon { font-size: 4.5rem; opacity: 0.15; margin-bottom: var(--spacing-xs); } p { font-size: 16px; font-weight: 700; color: var(--colors-text-primary); margin: 0; } &__sub { font-size: 12px; color: var(--colors-text-muted); max-width: 400px; margin-top: 6px; line-height: 1.5; } &.border-dashed { border-style: dashed; background-color: transparent; } }
.checkbox-container { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; color: var(--colors-text-primary); input { display: none; } &__box { width: 16px; height: 16px; border: 2px solid var(--colors-surface-border); border-radius: 4px; position: relative; transition: all 0.15s; } input:checked + &__box { background-color: var(--colors-brand-primary); border-color: var(--colors-brand-primary); &::after { content: '✓'; position: absolute; color: white; font-size: 11px; font-weight: bold; left: 2px; top: -2px; } } }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--colors-text-muted); gap: 12px; i { font-size: 24px; color: var(--colors-brand-primary); } }

.mb-xs { margin-bottom: var(--spacing-xs); }
.mb-md { margin-bottom: var(--spacing-md); }
.u-text-primary { color: var(--colors-brand-primary) !important; }
</style>
