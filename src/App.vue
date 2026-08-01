<script setup lang="ts">
import Snackbar from "@/components/Snackbar.vue";
</script>

<template>
	<router-view />
	<Snackbar />
</template>

<style lang="scss" scoped>
@use "@/styles/layout/_app.scss";
</style>
