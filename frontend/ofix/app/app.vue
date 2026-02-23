<template>
  <div class="app-layout">
    <main class="app-main">
      <NuxtPage />
    </main>
    <Footer />
  </div>
</template>

<style>
/* Layout sticky footer: ocupa 100vh; footer sempre na base */
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  padding: var(--space-4);
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
}
</style>
