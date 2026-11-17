<script setup lang="ts">
/**
 * A new editor's way to Autoconfirmed: a Codex progress bar for each condition,
 * then the rights it unlocks, folded away in an accordion. Shown in the Impact
 * card for the New mock user. The numbers are illustrative, not the reader's own.
 */
import { CdxAccordion, CdxProgressBar } from '@wikimedia/codex'

interface Requirement {
  label: string
  value: number
  target: number
}

/* English Wikipedia's thresholds, with fixed progress to show the idea. */
const REQUIREMENTS: readonly Requirement[] = [
  { label: 'Edits', value: 7, target: 10 },
  { label: 'Days since first edit', value: 1, target: 4 },
]

const UNLOCKS: readonly string[] = ['Move pages', 'Edit semi-protected pages', 'Upload images']
</script>

<template>
  <section class="home-autoconfirmed-progress">
    <h3 class="home-autoconfirmed-progress__heading">Progress</h3>

    <!-- CODEX+ CdxProgressBar: the bar and its labels are sibling roots, so each pair gets a wrapper. -->
    <div
      v-for="requirement in REQUIREMENTS"
      :key="requirement.label"
      class="home-autoconfirmed-progress__requirement"
    >
      <CdxProgressBar
        :value="requirement.value"
        :max="requirement.target"
        :start-label="requirement.label"
        :end-label="`${requirement.value} of ${requirement.target}`"
      />
    </div>

    <!-- Closed at first. An h4: "Progress" above is the h3. -->
    <CdxAccordion separation="minimal" heading-level="h4">
      <template #title>Unlocks: Autoconfirmed</template>
      <ul class="home-autoconfirmed-progress__list">
        <li v-for="unlock in UNLOCKS" :key="unlock">{{ unlock }}</li>
      </ul>
    </CdxAccordion>
  </section>
</template>

<style scoped>
/* After the impact stats, with a rule between. */
.home-autoconfirmed-progress {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  margin-top: var(--spacing-75);
  padding-top: var(--spacing-75);
  border-top: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

/* Codex Heading 4, as the module's own heading: Heading 3 would outsize it. */
.home-autoconfirmed-progress__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

/* The labels sit just under their own bar; the section's wider gap falls between requirements. */
.home-autoconfirmed-progress__requirement {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.home-autoconfirmed-progress__list {
  margin: 0;
  padding-inline-start: var(--spacing-150);
}
</style>
