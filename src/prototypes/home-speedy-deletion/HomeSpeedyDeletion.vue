<script setup lang="ts">
/**
 * The Speedy deletion module's body. On the Home: how many pages wait for
 * speedy deletion (bold and red, under a "Backlogged" chip, over the
 * threshold), the newest few, and a link to the whole queue. As a `feed` (its
 * own page, `[module]/index.vue`): every page in the queue, newest to join
 * first, as divider rows. Either way a page opens in the preview dialog, whose
 * Previous and Next step through the whole queue.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CdxButton, CdxCard, CdxInfoChip } from '@wikimedia/codex'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

import { HOME_PATH } from './homeRoutes'
import {
  BACKLOG_THRESHOLD,
  loadSpeedyDeletionPages,
  type SpeedyDeletionPage,
} from './loadSpeedyDeletion'
import SpeedyDeletionPreview from './SpeedyDeletionPreview.vue'
import { useModuleLoad } from './useModuleLoad'

const props = defineProps<{
  /** Every page, as divider rows (the module's own page). */
  feed?: boolean
}>()

/** Pages the Home shows; the rest wait on the module's own page. */
const HOME_COUNT = 3

/** Skeleton rows while loading. */
const SKELETONS = 6

const route = useRoute()

const { items: pages, loading, error, reload } = useModuleLoad(() => '', loadSpeedyDeletionPages)

const shown = computed(() => (props.feed ? pages.value : pages.value.slice(0, HOME_COUNT)))
const backlogged = computed(() => pages.value.length > BACKLOG_THRESHOLD)

/** The page open in the preview, by its place in the queue. */
const previewIndex = ref<number | null>(null)

const feedLocation = computed(() => ({
  path: `${HOME_PATH}/speedy-deletion`,
  query: preservedQueryFromLocationQuery(route.query),
}))

/** The preview, unless the reader asked for a new tab or window (the page on Wikipedia). */
function preview(event: MouseEvent, index: number): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  previewIndex.value = index
}
</script>

<template>
  <div class="home-speedy" :class="{ 'home-speedy--feed': feed }" :aria-busy="loading">
    <div v-if="error" class="home-speedy__message">
      <p>Couldn't load this section.</p>
      <CdxButton weight="quiet" @click="reload">Try again</CdxButton>
    </div>

    <p v-else-if="!loading && !pages.length" class="home-speedy__message">
      Nothing waiting for speedy deletion right now.
    </p>

    <template v-else>
      <p v-if="!feed && !loading" class="home-speedy__summary">
        <CdxInfoChip v-if="backlogged" status="error">Backlogged</CdxInfoChip>
        <span>
          <span
            class="home-speedy__count"
            :class="{ 'home-speedy__count--backlogged': backlogged }"
          >
            {{ pages.length.toLocaleString() }}
          </span>
          {{ pages.length === 1 ? 'page waits' : 'pages wait' }} for speedy deletion
        </span>
      </p>

      <div class="home-speedy__list">
        <template v-if="loading">
          <div
            v-for="index in feed ? SKELETONS : HOME_COUNT"
            :key="index"
            class="home-card-skeleton"
            aria-hidden="true"
          />
        </template>

        <CdxCard
          v-for="(page, index) in shown"
          v-else
          :key="page.key"
          :url="page.href"
          :separation="feed ? 'divider' : undefined"
          @click="preview($event, index)"
        >
          <template #title>
            {{ page.title }}
          </template>
          <template v-if="page.ago" #supporting-text>
            {{ page.ago }}
          </template>
        </CdxCard>
      </div>

      <!-- A link that looks like a button: it goes somewhere (Codex's CSS-only button). -->
      <RouterLink
        v-if="!feed && !loading && pages.length > HOME_COUNT"
        class="home-speedy__all cdx-button cdx-button--fake-button cdx-button--fake-button--enabled"
        :to="feedLocation"
      >
        Review all {{ pages.length.toLocaleString() }}
      </RouterLink>
    </template>

    <SpeedyDeletionPreview v-model:index="previewIndex" :pages="pages" />
  </div>
</template>

<style scoped>
.home-speedy {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.home-speedy__message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-subtle);
}

.home-speedy__message p {
  margin: 0;
}

/* A feed's message starts its 12px under the bar, as a divider row would. */
.home-speedy--feed .home-speedy__message {
  padding-top: var(--spacing-75);
}

.home-speedy__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
  margin: 0;
  color: var(--color-base);
}

.home-speedy__count--backlogged {
  color: var(--color-error);
  font-weight: var(--font-weight-bold);
}

.home-speedy__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

/* A full-width bar under the cards, on both skins. */
.home-speedy__all {
  display: flex;
  max-width: none;
}

/*
 * CODEX+ No skeleton / loading-placeholder component in Codex.
 * The card's own outline, empty. The height matches a card (title, supporting text).
 */
.home-card-skeleton {
  box-sizing: border-box;
  height: 66px;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
}

/* A feed: divider rows, so no gap between them, and skeletons are rows too (no outline, a rule between). */
.home-speedy--feed .home-speedy__list {
  gap: 0;
}

.home-speedy--feed .home-card-skeleton {
  border-width: 0;
  border-radius: 0;
}

.home-speedy--feed .home-card-skeleton + .home-card-skeleton {
  border-top-width: var(--border-width-base);
}
</style>
