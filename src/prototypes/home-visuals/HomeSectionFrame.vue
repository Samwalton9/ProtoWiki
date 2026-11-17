<script setup lang="ts">
/** A Home module's frame: its heading (and any heading actions) over whatever the module shows. */
import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

defineProps<{
  id: string
  /** Omitted on a module's own page, whose bar carries the title. */
  title?: string
  /** Shown before the title. Decorative: the title names the module. */
  icon?: Icon
}>()
</script>

<template>
  <section class="home-section-frame" :data-module-id="id">
    <div v-if="title" class="home-section-frame__header">
      <h2 class="home-section-frame__heading">
        <CdxIcon v-if="icon" :icon="icon" class="home-section-frame__icon" />
        {{ title }}
      </h2>
      <span v-if="$slots.actions" class="home-section-frame__actions">
        <slot name="actions" />
      </span>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.home-section-frame {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

/* Actions sit at the heading's end. Every row is one button tall (32px), so the
   button fits inside it and headings with actions or without keep one height. */
.home-section-frame__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  min-height: var(--min-size-interactive-pointer);
}

.home-section-frame__actions {
  display: flex;
  flex-shrink: 0;
}

/* Codex Heading 4 — the page title above is the h1. */
.home-section-frame__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  color: var(--color-base);
}

/* The icon sits before the title, centred on its line. */
.home-section-frame__heading:has(.home-section-frame__icon) {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}
</style>
