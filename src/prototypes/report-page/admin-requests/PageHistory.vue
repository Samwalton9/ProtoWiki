<script setup lang="ts">
/**
 * A page's recent edits in the style of Wikipedia's history page
 * (`?action=history`): "(cur | prev) time user (talk | contribs) m size (±n)
 * (summary) Tags: …". Links open on the wiki; cur / prev / undo are mocks.
 */
import { computed, ref, watch } from 'vue'
import { CdxMessage, CdxProgressBar } from '@wikimedia/codex'

import { fetchPageHistory, HISTORY_HOST, type PageHistory } from './fetchPageHistory'

const props = defineProps<{
  page: string
}>()

const history = ref<PageHistory | null>(null)
const error = ref<string | null>(null)

watch(
  () => props.page,
  async (page) => {
    history.value = null
    error.value = null
    try {
      const result = await fetchPageHistory(page)
      if (page === props.page) history.value = result
    } catch (err) {
      if (page === props.page) error.value = err instanceof Error ? err.message : String(err)
    }
  },
  { immediate: true },
)

const wikiPath = computed(() => encodeURIComponent(props.page.replace(/ /g, '_')))
const fullHistoryUrl = computed(
  () => `https://${HISTORY_HOST}/w/index.php?title=${wikiPath.value}&action=history`,
)

const editCountText = computed(() => {
  if (!history.value) return ''
  const count = history.value.editCount.toLocaleString('en')
  const noun = history.value.editCount === 1 ? 'edit' : 'edits'
  return history.value.editCountCapped ? `More than ${count} ${noun}` : `${count} ${noun}`
})

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** MediaWiki's default history date: "23:47, 19 November 2026" (UTC). */
function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function formatDiff(diff: number): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
  return `${sign}${Math.abs(diff).toLocaleString('en')}`
}

/** Display names for core change tags; others are tidied from their id. */
const TAG_NAMES: Record<string, string> = {
  'mw-reverted': 'Reverted',
  'mw-undo': 'Undo',
  'mw-rollback': 'Rollback',
  'mw-manual-revert': 'Manual revert',
  'mw-replace': 'Replaced',
  'mw-blank': 'Blanking',
  'mw-new-redirect': 'New redirect',
  'mw-removed-redirect': 'Removed redirect',
  'mw-changed-redirect-target': 'Redirect target changed',
}

function tagName(tag: string): string {
  const name = TAG_NAMES[tag] ?? tag.replace(/^mw-/, '').replace(/[-_]/g, ' ')
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function userUrl(user: string, prefix: 'User' | 'User talk' | 'Special:Contributions'): string {
  const target = `${prefix}${prefix.startsWith('Special') ? '/' : ':'}${user}`
  return `https://${HISTORY_HOST}/wiki/${encodeURIComponent(target.replace(/ /g, '_'))}`
}

function revisionUrl(revid: number): string {
  return `https://${HISTORY_HOST}/w/index.php?title=${wikiPath.value}&oldid=${revid}`
}
</script>

<template>
  <section class="page-history">
    <div class="page-history__header">
      <h4 class="page-history__title">Recent edits</h4>
      <span v-if="history" class="page-history__count">
        {{ editCountText }} ·
        <a :href="fullHistoryUrl" target="_blank" rel="noopener">View full history</a>
      </span>
    </div>

    <CdxProgressBar v-if="!history && !error" inline aria-label="Loading page history" />
    <CdxMessage v-else-if="error" type="error" inline>{{ error }}</CdxMessage>
    <p v-else-if="history && !history.entries.length" class="page-history__empty">
      This page has no edits.
    </p>

    <!-- Punctuation comes from CSS, as in MediaWiki, so template whitespace cannot shift it. -->
    <ul v-else-if="history" class="page-history__list">
      <li v-for="(entry, index) in history.entries" :key="entry.revid" class="page-history__line">
        <span class="page-history__group">
          <span v-if="index === 0">cur</span>
          <span v-else><a href="#" @click.prevent>cur</a></span>
          <span v-if="!entry.parentid">prev</span>
          <span v-else><a href="#" @click.prevent>prev</a></span>
        </span>
        <a :href="revisionUrl(entry.revid)" target="_blank" rel="noopener">
          {{ formatTimestamp(entry.timestamp) }}
        </a>
        <template v-if="entry.user">
          <a :href="userUrl(entry.user, 'User')" target="_blank" rel="noopener">
            {{ entry.user }}
          </a>
          <span class="page-history__group">
            <span>
              <a :href="userUrl(entry.user, 'User talk')" target="_blank" rel="noopener">talk</a>
            </span>
            <span>
              <a
                :href="userUrl(entry.user, 'Special:Contributions')"
                target="_blank"
                rel="noopener"
              >
                contribs
              </a>
            </span>
          </span>
        </template>
        <span v-else class="page-history__muted">(username removed)</span>
        <abbr v-if="entry.minor" class="page-history__minor" title="This is a minor edit">m</abbr>
        <span class="page-history__separator" aria-hidden="true" />
        <span>{{ entry.size.toLocaleString('en') }} bytes</span>
        <span
          v-if="entry.sizeDiff !== null"
          class="page-history__diff"
          :class="{
            'page-history__diff--pos': entry.sizeDiff > 0,
            'page-history__diff--neg': entry.sizeDiff < 0,
            'page-history__diff--large': Math.abs(entry.sizeDiff) >= 500,
          }"
        >
          {{ formatDiff(entry.sizeDiff) }}
        </span>
        <span class="page-history__separator" aria-hidden="true" />
        <!-- Server-rendered, sanitised edit summary from the Action API. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          v-if="entry.parsedComment"
          class="page-history__comment"
          v-html="entry.parsedComment"
        />
        <span v-else class="page-history__comment page-history__muted">No edit summary</span>
        <span class="page-history__group">
          <span><a href="#" @click.prevent>undo</a></span>
        </span>
        <span v-if="entry.tags.length" class="page-history__tags">
          <a :href="`https://${HISTORY_HOST}/wiki/Special:Tags`" target="_blank" rel="noopener">
            {{ entry.tags.length === 1 ? 'Tag' : 'Tags' }}
          </a>
          <span v-for="tag in entry.tags" :key="tag" class="page-history__tag">
            {{ tagName(tag) }}
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.page-history {
  margin-top: var(--spacing-100, 16px);
}

.page-history__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--spacing-25, 4px) var(--spacing-100, 16px);
  margin-bottom: var(--spacing-50, 8px);
}

.page-history__title {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  font-weight: var(--font-weight-bold);
}

.page-history__count {
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.page-history__empty {
  margin: 0;
  color: var(--color-subtle);
}

/* Wikipedia's history: a plain bulleted list, one edit per line. */
.page-history__list {
  margin: 0;
  padding-inline-start: var(--spacing-150, 24px);
  list-style: disc;
}

.page-history__line {
  margin-bottom: var(--spacing-12, 2px);
}

/* Space between the parts of a line; inline, so long summaries still wrap. */
.page-history__line > * + * {
  margin-inline-start: 0.35em;
}

/* "(cur | prev)", "(talk | contribs)", "(undo)": MediaWiki's mw-changeslist-links. */
.page-history__group::before {
  content: '(';
}

.page-history__group::after {
  content: ')';
}

.page-history__group > span + span::before {
  content: ' | ';
}

/* MediaWiki's `.mw-changeslist-separator:empty::before`. */
.page-history__separator::before {
  content: '. .';
  color: var(--color-subtle);
}

.page-history__minor {
  font-weight: var(--font-weight-bold);
  text-decoration: none;
  border-bottom: 0;
}

.page-history__muted {
  color: var(--color-subtle);
}

.page-history__diff {
  color: var(--color-subtle);
}

.page-history__diff--pos {
  color: var(--color-success);
}

.page-history__diff--neg {
  color: var(--color-destructive);
}

.page-history__diff--large {
  font-weight: var(--font-weight-bold);
}

.page-history__comment {
  font-style: italic;
}

.page-history__comment::before {
  content: '(';
}

.page-history__comment::after {
  content: ')';
}

.page-history__tags > a::after {
  content: ':';
}

.page-history__tag:first-of-type {
  margin-inline-start: 0.35em;
}

.page-history__tag + .page-history__tag::before {
  content: ', ';
}
</style>
