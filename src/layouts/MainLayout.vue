<template>
    <div class="app-layout" :class="{ 'app-layout--dark': isDarkMode }">
        <!-- 手机端遮罩层 -->
        <div v-if="isMobile && isMenuOpen" class="overlay" @click="isMenuOpen = false"></div>

        <!-- 1. 顶部导航栏：改用你的品牌主色 Primary Color -->
        <header class="header">
            <div class="header-left">
                <!-- 切换按钮在品牌色背景下自动变白 -->
                <button class="icon-btn icon-btn--inverse" @click="toggleSidebar" aria-label="Toggle Menu">
                    <i class="mdi mdi-menu"></i>
                </button>
                <img src="../assets/logo.svg" alt="GS TECH" class="header__logo" />
            </div>

            <div class="header-right">
                <button class="icon-btn icon-btn--inverse" @click="toggleTheme">
                    <i class="mdi" :class="isDarkMode ? 'mdi-brightness-4' : 'mdi-brightness-7'"></i>
                </button>
            </div>
        </header>

        <!-- 主体容器 -->
        <div class="app-container">
            
            <!-- 2. 侧边栏：多终端响应式自适应 -->
            <aside
                class="side-menu"
                :class="{
                    'is-mobile': isMobile,
                    'is-open': isMobile ? isMenuOpen : true,
                    'is-rail': (isDesktop && isDocked) || isTablet, /* 平板端强制开启你最爱的精美 Dock 模式 */
                }"
            >
                <div class="sidebar_header" v-if="isMobile">
                    <button class="icon-btn close" @click="isMenuOpen = false">
                        <i class="mdi mdi-close"></i>
                    </button>
                </div>

                <nav class="nav">
                    <!-- Dashboard -->
                    <router-link
                        class="nav__item"
                        to="/"
                        active-class="nav__item--active"
                        exact-active-class="nav__item--active"
                        title="Dashboard"
                    >
                        <i class="mdi mdi-view-dashboard nav__icon"></i>
                        <span class="nav__label">Dashboard</span>
                    </router-link>

                    <!-- Work Orders 组 -->
                    <div class="nav__group" :class="{ 'nav__group--expanded': groups.workOrders }">
                        <button
                            class="nav__item"
                            @click="toggleGroup('workOrders')"
                            title="Work Orders"
                        >
                            <i class="mdi mdi-clipboard-text-clock nav__icon"></i>
                            <span class="nav__label">Work Orders</span>
                            <i
                                v-show="!((isDesktop && isDocked) || isTablet)"
                                class="mdi nav__tail"
                                :class="groups.workOrders ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                            ></i>
                        </button>

                        <ul
                            class="nav__children"
                            v-show="!((isDesktop && isDocked) || isTablet) && groups.workOrders"
                        >
                            <li><router-link to="/new" class="nav__child" active-class="nav__child-active"><span>New</span></router-link></li>
                            <li><router-link to="/pending" class="nav__child" active-class="nav__child-active"><span>Pending Approval</span></router-link></li>
                            <li><router-link to="/progress" class="nav__child" active-class="nav__child-active"><span>In Progress</span></router-link></li>
                            <li><router-link to="/done" class="nav__child" active-class="nav__child-active"><span>Done</span></router-link></li>
                            <li><router-link to="/completed" class="nav__child" active-class="nav__child-active"><span>Completed</span></router-link></li>
                            <li><router-link to="/claimed" class="nav__child" active-class="nav__child-active"><span>Claimed</span></router-link></li>
                            <li><router-link to="/closed" class="nav__child" active-class="nav__child-active"><span>Closed</span></router-link></li>
                            <li><router-link to="/cancelled" class="nav__child" active-class="nav__child-active"><span>Cancelled</span></router-link></li>
                        </ul>
                    </div>

                    <!-- Customers -->
                    <router-link class="nav__item" to="/customer" active-class="nav__item--active" title="Customers">
                        <i class="mdi mdi-account-box-multiple nav__icon"></i>
                        <span class="nav__label">Customers</span>
                    </router-link>

                    <!-- Employees -->
                    <router-link class="nav__item" to="/user" active-class="nav__item--active" title="Employees">
                        <i class="mdi mdi-account-group nav__icon"></i>
                        <span class="nav__label">Employees</span>
                    </router-link>

                    <!-- Maintenance 组 -->
                    <div class="nav__group" :class="{ 'nav__group--expanded': groups.maintenance }">
                        <div class="nav__item" @click="toggleGroup('maintenance')" title="Maintenance">
                            <i class="mdi mdi-tools nav__icon"></i>
                            <span class="nav__label">Maintenance</span>
                            <i
                                v-show="!((isDesktop && isDocked) || isTablet)"
                                class="mdi nav__tail"
                                :class="groups.maintenance ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                            ></i>
                        </div>
                        <ul
                            class="nav__children"
                            v-show="!((isDesktop && isDocked) || isTablet) && groups.maintenance"
                        >
                            <li><router-link to="/maintenance/location" class="nav__child" active-class="nav__child-active"><span>Location</span></router-link></li>
                            <li><router-link to="/maintenance/work-types" class="nav__child" active-class="nav__child-active"><span>Work Type</span></router-link></li>
                            <li><router-link to="/maintenance/parts" class="nav__child" active-class="nav__child-active"><span>Parts Change</span></router-link></li>
                            <li><router-link to="/maintenance/services" class="nav__child" active-class="nav__child-active"><span>Service Provided</span></router-link></li>
                            <li><router-link to="/maintenance/doc-no-format" class="nav__child" active-class="nav__child-active"><span>Doc No Format</span></router-link></li>
                        </ul>
                    </div>

                    <!-- Audit Log -->
                    <router-link class="nav__item" to="/audit-log" active-class="nav__item--active" title="Audit Log">
                        <i class="mdi mdi-history nav__icon"></i>
                        <span class="nav__label">Audit Log</span>
                    </router-link>

                    <!-- Settings -->
                    <router-link class="nav__item" to="/settings" active-class="nav__item--active" title="Settings">
                        <i class="mdi mdi-cog nav__icon"></i>
                        <span class="nav__label">Settings</span>
                    </router-link>

                    <!-- About -->
                    <router-link class="nav__item" to="/about" active-class="nav__item--active" title="About">
                        <i class="mdi mdi-information nav__icon"></i>
                        <span class="nav__label">About</span>
                    </router-link>
                </nav>
            </aside>

            <!-- 3. 右侧内容主视口 -->
            <main 
                class="app-main" 
                :class="{ 
                    'app-main--rail': (isDesktop && isDocked) || isTablet 
                }"
            >
                <div class="app-content">
                    <router-view />
                </div>

                <footer class="app-footer">
                    <p>Copyright © 2026</p>
                    <p>(Version 1.0.1.20260410.1.0a)</p>
                    <p>Asiasoft Business Solutions 200801030089 (831418-H).</p>
                    <p>All rights reserved.</p>
                </footer>
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";

const isDocked = ref(false); 
const isMobile = ref(false);
const isTablet = ref(false);
const isDesktop = ref(true);
const isMenuOpen = ref(false); 
const isDarkMode = ref(false);

const groups = reactive({
    workOrders: true,
    maintenance: false,
});

function toggleSidebar() {
    if (isMobile.value) {
        isMenuOpen.value = !isMenuOpen.value;
    } else {
        // 如果在平板上点击，则是从强行 Rail 转换到完全展开状态
        if (isTablet.value) {
            isTablet.value = false;
            isDesktop.value = true;
            isDocked.value = false;
        } else {
            isDocked.value = !isDocked.value;
        }
    }
}

function toggleGroup(key: 'workOrders' | 'maintenance') {
    // 如果在 Dock (Rail) 状态或平板下点击组，自动展开侧边栏以便用户看清二级菜单
    if (isDocked.value || isTablet.value) {
        isDocked.value = false;
        isTablet.value = false;
        isDesktop.value = true;
        groups[key] = true;
        return;
    }
    groups[key] = !groups[key];
}

function toggleTheme() {
    isDarkMode.value = !isDarkMode.value;
    document.documentElement.setAttribute("data-theme", isDarkMode.value ? "dark" : "light");
}

// 精细化的响应式断点控制设计
function handleResize() {
    const width = window.innerWidth;
    
    isMobile.value = width < 768;
    isTablet.value = width >= 768 && width <= 1024;
    isDesktop.value = width > 1024;
    
    if (isMobile.value) {
        isMenuOpen.value = false; 
    }
}

onMounted(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
});
</script>