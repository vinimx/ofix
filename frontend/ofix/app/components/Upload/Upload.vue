<template>
    <section class="card upload-card">
        <div class="card-body">
            <h2 class="card-title">Upload de arquivo</h2>

            <div class="form-group mb-3">
                <div class="custom-file">
                    <input
                        id="file-upload"
                        ref="inputRef"
                        type="file"
                        class="custom-file-input"
                        accept=".pdf,application/pdf"
                        :lang="'pt-BR'"
                        @change="handleFileChange"
                    />
                    <label class="custom-file-label" for="file-upload">
                        {{ file ? file.name : 'Selecionar arquivo PDF' }}
                    </label>
                </div>
            </div>

            <div class="form-group mb-3">
                <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="!file || loading"
                    @click="uploadFile"
                >
                    <span v-if="loading" class="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true" />
                    {{ loading ? 'Enviando...' : 'Enviar PDF' }}
                </button>
            </div>

            <div v-if="error" class="alert alert-danger" role="alert">
                {{ error }}
            </div>

            <div v-if="success" class="alert alert-success" role="alert">
                Arquivo enviado com sucesso! Acompanhe o status abaixo.
            </div>

            <div v-if="file && !error && !success" class="card upload-file-info">
                <div class="card-body">
                    <h3 class="card-title">Arquivo selecionado</h3>
                    <ul class="list-group list-group-flush mb-0">
                        <li class="list-group-item bg-transparent px-0 py-2">
                            <strong>Nome:</strong> {{ file.name }}
                        </li>
                        <li class="list-group-item bg-transparent px-0 py-2">
                            <strong>Tamanho:</strong> {{ formatSize(file.size) }}
                        </li>
                        <li class="list-group-item bg-transparent px-0 py-2">
                            <strong>Tipo:</strong> {{ file.type }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</template>

<style src="./Upload.css" scoped></style>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
    (e: 'uploaded', jobId: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    error.value = null
    success.value = false
    if (!input.files?.length) {
        file.value = null
        return
    }
    const chosen = input.files[0]
    if (!chosen) {
        file.value = null
        return
    }
    if (chosen.type !== 'application/pdf') {
        error.value = 'Selecione apenas arquivos PDF.'
        file.value = null
        return
    }
    if (chosen.size > MAX_SIZE_BYTES) {
        error.value = `O arquivo excede o limite de ${MAX_SIZE_MB} MB.`
        file.value = null
        return
    }
    file.value = chosen
}

const uploadFile = async () => {
    if (!file.value) return
    loading.value = true
    error.value = null
    success.value = false
    try {
        const formData = new FormData()
        formData.append('file', file.value)

        const response = await $fetch<{ jobId: string }>('/api/upload', {
            method: 'POST',
            body: formData,
        })

        success.value = true
        file.value = null
        if (inputRef.value) inputRef.value.value = ''
        emit('uploaded', response.jobId)
    } catch (e: unknown) {
        const err = e as { data?: { data?: { message?: string }; statusMessage?: string } }
        error.value =
            err?.data?.data?.message ||
            err?.data?.statusMessage ||
            'Falha ao enviar o arquivo. Tente novamente.'
    } finally {
        loading.value = false
    }
}
</script>
