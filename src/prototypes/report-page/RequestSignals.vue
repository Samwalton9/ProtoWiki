<script setup lang="ts">
/** Info chips for a request's page signals ("High activity", "High pageviews"). */
import { CdxInfoChip } from '@wikimedia/codex'
import type { RequestSignal } from './adminRequests'
import { REQUEST_SIGNALS as SIGNALS } from './requestSignals'

defineProps<{
  signals?: RequestSignal[]
}>()
</script>

<template>
  <span v-if="signals?.length" class="request-signals">
    <CdxInfoChip
      v-for="signal in signals"
      :key="signal"
      :icon="SIGNALS[signal].icon"
      :title="SIGNALS[signal].title"
    >
      {{ SIGNALS[signal].label }}
    </CdxInfoChip>
  </span>
</template>

<style scoped>
.request-signals {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-25, 4px);
  margin-top: var(--spacing-25, 4px);
}
</style>
