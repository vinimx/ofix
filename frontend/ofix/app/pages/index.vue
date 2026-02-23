<template>
    <div>
        <Hero />
        <Upload @uploaded="onUploaded" />
        <JobList ref="jobListRef" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const jobListRef = ref<{ refresh: () => void } | null>(null)

function onUploaded(_jobId: string) {
    jobListRef.value?.refresh()
}
</script>
