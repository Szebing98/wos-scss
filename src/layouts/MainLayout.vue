<template>
	<div class="app-layout" :class="{ 'app-layout--dark': isDarkMode }">
		<header class="app-header">
			<div class="app-header__left">
				<button class="app-header__trigger" @click="toggleSidebar">
					<i class="mdi mdi-menu"></i>
				</button>
				<span class="app-header__logo-text">GS TECH</span>
			</div>

			<div class="app-header__right">
				<button class="app-header__theme-toggle" @click="toggleTheme">
					<i
						class="mdi"
						:class="isDarkMode ? 'mdi-brightness-4' : 'mdi-brightness-7'"
					></i>
				</button>
			</div>
		</header>

		<div class="app-container">
			<aside class="app-sidebar" :class="{ 'app-sidebar--dock': isDocked }">
				<nav class="app-nav">
					<router-link to="/" class="app-nav__link" active-class="app-nav__link--active">
						<i class="mdi mdi-view-dashboard app-nav__icon"></i>
						<span class="app-nav__text">Dashboard</span>
					</router-link>

					<div
						class="app-nav__group"
						:class="{ 'app-nav__group--expanded': groups.workOrders }"
					>
						<div class="app-nav__group-header" @click="toggleGroup('workOrders')">
							<div class="app-nav__group-title">
								<i class="mdi mdi-clipboard-text-clock app-nav__icon"></i>
								<span class="app-nav__text">Work Orders</span>
							</div>
							<i class="mdi mdi-chevron-down app-nav__arrow"></i>
						</div>
						<div class="app-nav__group-items">
							<router-link to="/new" class="app-nav__sublink">New</router-link>
							<router-link to="/pending" class="app-nav__sublink"
								>Pending Approval</router-link
							>
							<router-link to="/progress" class="app-nav__sublink"
								>In Progress</router-link
							>
							<router-link to="/done" class="app-nav__sublink">Done</router-link>
							<router-link to="/completed" class="app-nav__sublink"
								>Completed</router-link
							>
							<router-link to="/claimed" class="app-nav__sublink"
								>Claimed</router-link
							>
							<router-link to="/closed" class="app-nav__sublink">Closed</router-link>
							<router-link to="/cancelled" class="app-nav__sublink"
								>Cancelled</router-link
							>
						</div>
					</div>

					<router-link to="/customer" class="app-nav__link">
						<i class="mdi mdi-account-box-multiple app-nav__icon"></i>
						<span class="app-nav__text">Customers</span>
					</router-link>

					<router-link to="/user" class="app-nav__link">
						<i class="mdi mdi-account-group app-nav__icon"></i>
						<span class="app-nav__text">Employees</span>
					</router-link>

					<div
						class="app-nav__group"
						:class="{ 'app-nav__group--expanded': groups.maintenance }"
					>
						<div class="app-nav__group-header" @click="toggleGroup('maintenance')">
							<div class="app-nav__group-title">
								<i class="mdi mdi-tools app-nav__icon"></i>
								<span class="app-nav__text">Maintenance</span>
							</div>
							<i class="mdi mdi-chevron-down app-nav__arrow"></i>
						</div>
						<div class="app-nav__group-items">
							<router-link to="/maintenance/location" class="app-nav__sublink"
								>Location</router-link
							>
							<router-link to="/maintenance/work-types" class="app-nav__sublink"
								>Work Type</router-link
							>
							<router-link to="/maintenance/parts" class="app-nav__sublink"
								>Parts Change</router-link
							>
							<router-link to="/maintenance/services" class="app-nav__sublink"
								>Service Provided</router-link
							>
							<router-link to="/maintenance/doc-no-format" class="app-nav__sublink"
								>Doc No Format</router-link
							>
						</div>
					</div>

					<router-link to="/audit-log" class="app-nav__link">
						<i class="mdi mdi-history app-nav__icon"></i>
						<span class="app-nav__text">Audit Log</span>
					</router-link>

					<router-link to="/settings" class="app-nav__link">
						<i class="mdi mdi-cog app-nav__icon"></i>
						<span class="app-nav__text">Settings</span>
					</router-link>

					<router-link to="/about" class="app-nav__link">
						<i class="mdi mdi-information app-nav__icon"></i>
						<span class="app-nav__text">About</span>
					</router-link>
				</nav>
			</aside>

			<main class="app-main">
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
import { ref, reactive, onMounted } from "vue";

// 侧边栏开关状态 (false 为展开，true 为 Dock 停靠模式)
const isDocked = ref(false);
const isDarkMode = ref(false);

// 管理菜单组的折叠 (类似原版的 Expanded="true/false")
const groups = reactive({
	workOrders: true,
	maintenance: false,
});

function toggleSidebar() {
	isDocked.value = !isDocked.value;
}

function toggleGroup(key: "workOrders" | "maintenance") {
	// 💡 小交互：如果当前是 Dock 模式，点击菜单组时先将其撑开
	if (isDocked.value) {
		isDocked.value = false;
		groups[key] = true;
		return;
	}
	groups[key] = !groups[key];
}

function toggleTheme() {
	isDarkMode.value = !isDarkMode.value;
	document.documentElement.setAttribute("data-theme", isDarkMode.value ? "dark" : "light");
}

// 自动检测系统主题色 (复刻 Blazor 的 WatchSystemDarkModeAsync)
onMounted(() => {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	isDarkMode.value = mediaQuery.matches;
	document.documentElement.setAttribute("data-theme", isDarkMode.value ? "dark" : "light");

	mediaQuery.addEventListener("change", (e) => {
		isDarkMode.value = e.matches;
		document.documentElement.setAttribute("data-theme", isDarkMode.value ? "dark" : "light");
	});
});
</script>

<style lang="scss" scoped>
// 变量回落安全阀（如果全局没配，这里能确保安全）
:root {
	--header-height: 64px;
	--sidebar-width: 260px;
	--sidebar-dock-width: 68px;
}

.app-layout {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	background-color: #f8fafc;
	color: #1e293b;
	transition: background-color 0.3s;

	// 暗色模式局域样式映射
	&--dark {
		background-color: #0f172a;
		color: #f8fafc;

		.app-header {
			background-color: #1e293b;
			border-bottom-color: #334155;
		}
		.app-sidebar {
			background-color: #1e293b;
			border-right-color: #334155;
		}
		.app-nav__link,
		.app-nav__group-header {
			color: #94a3b8;
			&:hover {
				background-color: #334155;
				color: white;
			}
		}
		.app-nav__sublink {
			color: #64748b;
			&:hover {
				color: white;
			}
		}
		.app-nav__link--active {
			background-color: rgba(99, 102, 241, 0.15) !important;
			color: #818cf8 !important;
		}
		.app-footer {
			color: #64748b;
			border-top-color: #334155;
		}
	}
}

// 1. 顶部 Top Bar
.app-header {
	height: var(--header-height);
	background-color: white;
	border-bottom: 1px solid #e2e8f0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 24px;
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;

	&__left {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	&__logo-text {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	&__trigger,
	&__theme-toggle {
		background: transparent;
		border: none;
		font-size: 22px;
		color: inherit;
		cursor: pointer;
		padding: 6px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		&:hover {
			background-color: rgba(0, 0, 0, 0.04);
		}
	}
}

// 框架核心弹性大容器
.app-container {
	display: flex;
	flex-grow: 1;
	margin-top: var(--header-height);
	height: calc(100vh - var(--header-height));
}

// 2. 侧边栏 Sidebar (Dock核心)
.app-sidebar {
	width: var(--sidebar-width);
	background-color: #ffffff;
	border-right: 1px solid #e2e8f0;
	overflow-y: auto;
	overflow-x: hidden;
	flex-shrink: 0;
	transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1); // 丝滑伸缩动画

	// 💡 Dock 停靠核心：收缩到 68px，并隐藏文字与箭头
	&--dock {
		width: var(--sidebar-dock-width);

		.app-nav__text,
		.app-nav__arrow,
		.app-nav__group-items {
			display: none !important; // 强行抹除文字细节
		}
		.app-nav__link,
		.app-nav__group-header {
			justify-content: center;
			padding: 0;
			height: 48px;
		}
		.app-nav__icon {
			margin: 0;
			font-size: 20px;
		}
	}
}

// 3. 导航栏菜单核心
.app-nav {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 12px;

	&__link,
	&__group-header {
		display: flex;
		align-items: center;
		padding: 10px 16px;
		color: #475569;
		text-decoration: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			background-color: #f1f5f9;
			color: #0f172a;
		}
	}

	&__icon {
		font-size: 18px;
		margin-right: 12px;
		display: inline-flex;
	}
	&__text {
		flex-grow: 1;
		white-space: nowrap;
	}
	&__arrow {
		font-size: 16px;
		transition: transform 0.2s;
		white-space: nowrap;
	}

	// 多级菜单抽屉行为
	&__group {
		&-items {
			display: none; // 默认闭合
			flex-direction: column;
			gap: 2px;
			padding-left: 38px;
			margin-top: 2px;
		}

		&--expanded {
			.app-nav__arrow {
				transform: rotate(180deg);
			} // 箭头旋转
			.app-nav__group-items {
				display: flex;
			} // 展开子项
		}
	}

	&__sublink {
		padding: 8px 12px;
		color: #64748b;
		font-size: 13px;
		text-decoration: none;
		font-weight: 500;
		border-radius: 6px;
		white-space: nowrap;
		&:hover {
			color: var(--colors-brand-primary, #6366f1);
		}
	}

	&__link--active {
		background-color: rgba(99, 102, 241, 0.08) !important;
		color: #4f46e5 !important;
	}
}

// 4. 右侧内容主视口
.app-main {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	overflow-y: auto;
	box-sizing: border-box;
}

.app-content {
	flex-grow: 1;
	padding: 24px;
	width: 100%;
	box-sizing: border-box;
	max-width: 1600px; // 对应原版的 MaxWidth.ExtraLarge
	margin: 0 auto;
}

// 5. 页脚
.app-footer {
	border-top: 1px solid #e2e8f0;
	padding: 16px;
	text-align: center;
	color: #64748b;
	font-size: 12px;
	line-height: 1.6;
	background-color: transparent;
	p {
		margin: 0;
	}
}
</style>
