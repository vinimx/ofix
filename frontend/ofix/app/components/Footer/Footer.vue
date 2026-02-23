<template>
    <footer class="footer">
        <div class="footer-inner">
            <span class="footer-brand">
                <span class="footer-brand-name">OFIX</span>
                <span class="footer-brand-tagline">Conversor PDF para OFX</span>
            </span>
            <span class="footer-copy">
                &copy; {{ year }} OFIX. Todos os direitos reservados.
            </span>
        </div>
    </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style src="./Footer.css" scoped></style>
