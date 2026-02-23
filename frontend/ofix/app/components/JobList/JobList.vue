<template>
    <section class="card job-list-card mt-4">
        <div class="card-body">
            <div class="job-list-header">
                <div class="job-list-header-info">
                    <h2 class="card-title">Arquivos processados</h2>
                    <span v-if="jobs.length > 0" class="job-list-count">
                        {{ jobs.length }} {{ jobs.length === 1 ? 'arquivo' : 'arquivos' }}
                    </span>
                </div>
                <button
                    class="btn btn-sm job-list-refresh"
                    :class="loading ? 'btn-outline-secondary' : 'btn-outline-primary'"
                    :disabled="loading"
                    :aria-label="'Atualizar lista'"
                    @click="refresh"
                >
                    <span :class="['refresh-icon', { spinning: loading }]" aria-hidden="true">&#x21bb;</span>
                    {{ loading ? 'Atualizando...' : 'Atualizar' }}
                </button>
            </div>

            <div v-if="fetchError" class="alert alert-danger job-list-alert" role="alert">
                {{ fetchError }}
            </div>

            <div v-else-if="jobs.length === 0 && !loading" class="job-list-empty">
                <div class="job-list-empty-icon" aria-hidden="true">&#128196;</div>
                <p class="job-list-empty-title">Nenhum arquivo enviado ainda</p>
                <p class="job-list-empty-sub">Envie um PDF acima para iniciar a conversao</p>
            </div>

            <ul v-else class="list-group list-group-flush job-list">
                <li
                    v-for="job in jobs"
                    :key="job.id"
                    class="list-group-item job-item"
                    :class="`job-item--${job.status}`"
                >
                    <div class="job-item-info">
                        <span class="job-item-name" :title="job.originalName">
                            {{ job.originalName }}
                        </span>
                        <span class="job-item-date">
                            {{ formatDate(job.createdAt) }}
                        </span>
                    </div>
                    <div class="job-item-actions">
                        <span
                            v-if="job.status === 'processing' || job.status === 'pending'"
                            class="spinner-border spinner-border-sm job-spinner"
                            role="status"
                            aria-label="Processando"
                        />
                        <span class="badge job-badge" :class="badgeClass(job.status)">
                            {{ statusLabel(job.status) }}
                        </span>
                        <a
                            v-if="job.downloadAvailable"
                            :href="`/api/jobs/${job.id}/download`"
                            class="btn btn-sm job-download-btn"
                            download
                        >
                            &#11123; Baixar OFX
                        </a>
                        <span
                            v-if="job.status === 'failed'"
                            class="job-error-msg"
                            :title="job.error ?? 'Erro desconhecido'"
                        >
                            &#9888; Falha na conversao
                        </span>
                    </div>
                </li>
            </ul>
        </div>
    </section>
</template>

<style src="./JobList.css" scoped></style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Job {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    originalName: string
    createdAt: string
    downloadAvailable: boolean
    error?: string
}

const POLL_INTERVAL_MS = 4000

const jobs = ref<Job[]>([])
const loading = ref(false)
const fetchError = ref<string | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchJobs() {
    loading.value = true
    fetchError.value = null
    try {
        const response = await $fetch<{ jobs: Job[] }>('/api/jobs')
        jobs.value = response.jobs.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    } catch {
        fetchError.value = 'Nao foi possivel carregar os arquivos. Tente novamente.'
    } finally {
        loading.value = false
    }
}

function startPolling() {
    if (pollTimer) return
    pollTimer = setInterval(fetchJobs, POLL_INTERVAL_MS)
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
    }
}

function refresh() {
    fetchJobs()
}

defineExpose({ refresh })

function statusLabel(status: Job['status']): string {
    const labels: Record<Job['status'], string> = {
        pending: 'Aguardando',
        processing: 'Processando',
        completed: 'Concluido',
        failed: 'Falhou',
    }
    return labels[status]
}

function badgeClass(status: Job['status']): string {
    const classes: Record<Job['status'], string> = {
        pending: 'badge-secondary',
        processing: 'badge-primary',
        completed: 'badge-success',
        failed: 'badge-danger',
    }
    return classes[status]
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

onMounted(() => {
    fetchJobs()
    startPolling()
})

onUnmounted(() => {
    stopPolling()
})
</script>
