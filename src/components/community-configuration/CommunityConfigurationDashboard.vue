<script setup lang="ts">
/**
 * `Special:CommunityConfiguration`: what Community Configuration is, then a
 * card for each feature, leading to its editor page at `<basePath>/<id>`.
 * Wrap it in `ChromeWrapper`. Copy is the extension's own English messages.
 */
import { useRoute, useRouter } from 'vue-router'
import { CdxCard, CdxIcon } from '@wikimedia/codex'
import { cdxIconBook, cdxIconSpeechBubbles } from '@wikimedia/codex-icons'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

import type { CommunityConfigurationFeature } from './types'

const props = defineProps<{
  features: readonly CommunityConfigurationFeature[]
  /** The dashboard's own route; each feature's editor page is `<basePath>/<id>`. */
  basePath: string
}>()

const LEARN_MORE_URL =
  'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Community_configuration'
const FEEDBACK_URL = 'https://www.mediawiki.org/wiki/Talk:Growth'

const route = useRoute()
const router = useRouter()

function location(feature: CommunityConfigurationFeature) {
  return {
    path: `${props.basePath}/${feature.id}`,
    query: preservedQueryFromLocationQuery(route.query),
  }
}

/** In-app navigation, unless the reader asked for a new tab or window. */
function open(event: MouseEvent, feature: CommunityConfigurationFeature): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  event.preventDefault()
  void router.push(location(feature))
}
</script>

<template>
  <SpecialPageWrapper title="Community Configuration" class="cc-dashboard">
    <section class="cc-dashboard__guidelines">
      <h2 class="cc-dashboard__heading">What is Community Configuration?</h2>
      <p>
        Community Configuration is a tool that allows communities to set up and control the
        configuration of different Wikipedia features, helping administrators suit their community
        specific needs.
      </p>

      <div class="cc-dashboard__guideline">
        <CdxIcon :icon="cdxIconBook" class="cc-dashboard__guideline-icon" />
        <div>
          <h3 class="cc-dashboard__subheading">Learn more</h3>
          <p>
            <a :href="LEARN_MORE_URL" target="_blank">Learn more</a> about Community Configuration,
            what it is, how it works, and the team’s ongoing work on it.
          </p>
        </div>
      </div>

      <div class="cc-dashboard__guideline">
        <CdxIcon :icon="cdxIconSpeechBubbles" class="cc-dashboard__guideline-icon" />
        <div>
          <h3 class="cc-dashboard__subheading">Send us your feedback</h3>
          <p>
            We would love to hear your thoughts! Reach out to us through our
            <a :href="FEEDBACK_URL" target="_blank">talk page</a>.
          </p>
        </div>
      </div>
    </section>

    <section class="cc-dashboard__features">
      <h2 class="cc-dashboard__heading">Features</h2>

      <!-- PROTOWIKI+ Not on wiki, which always has features: this area starts with none. -->
      <p v-if="!features.length" class="cc-dashboard__empty">No features can be configured yet.</p>

      <CdxCard
        v-for="feature in features"
        :key="feature.id"
        :url="router.resolve(location(feature)).href"
        @click="open($event, feature)"
      >
        <template #title>{{ feature.title }}</template>
        <template #description>{{ feature.description }}</template>
      </CdxCard>
    </section>
  </SpecialPageWrapper>
</template>

<style scoped>
.cc-dashboard {
  padding-bottom: var(--spacing-300);
}

/* Vector: a readable column, as the extension's dashboard. */
.cc-dashboard[data-skin='desktop'] {
  max-width: calc(984px + 2 * var(--spacing-150));
}

.cc-dashboard p {
  margin: 0;
}

.cc-dashboard a {
  color: var(--color-progressive);
  text-decoration: none;
}

.cc-dashboard a:hover {
  text-decoration: underline;
}

.cc-dashboard__guidelines,
.cc-dashboard__features {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.cc-dashboard__features {
  gap: var(--spacing-50);
  margin-top: var(--spacing-200);
}

/* Codex Heading 3. */
.cc-dashboard__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-x-large);
  color: var(--color-base);
}

/* Codex Heading 5 (Body bold). */
.cc-dashboard__subheading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.cc-dashboard__guideline {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75);
}

.cc-dashboard__guideline-icon {
  flex-shrink: 0;
  margin-top: var(--spacing-12);
  color: var(--color-subtle);
}

.cc-dashboard__empty {
  color: var(--color-subtle);
}
</style>
