<script setup lang="ts">
/**
 * A speedy deletion candidate in a preview dialog. The header carries what
 * it's tagged for and when it was created and last edited, and by whom; the
 * body is the page as it renders on Wikipedia, deletion tag and all. Previous and Next step through the queue
 * behind it; Delete and Decline don't do anything yet. Full screen on Minerva.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { CdxButton, CdxDialog, CdxIcon, CdxInfoChip, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconClose, cdxIconNext, cdxIconPrevious } from '@wikimedia/codex-icons'

import ArticleRenderer from '@/components/article/ArticleRenderer.vue'
import { useSkin } from '@/composables/useSkin'

import {
  loadPageContext,
  historyUrl,
  loadPagePreview,
  pageUrl,
  type PageContext,
  type PageEdit,
  type SpeedyDeletionPage,
} from './loadSpeedyDeletion'
import { formatAgo } from './relativeTime'

const props = defineProps<{
  pages: readonly SpeedyDeletionPage[]
}>()

/** The open page's place in `pages`; `null` when the dialog is closed. */
const index = defineModel<number | null>('index', { default: null })

const skin = useSkin()
const isMobile = computed(() => skin.value === 'mobile')

const page = computed(() => (index.value == null ? null : (props.pages[index.value] ?? null)))
const hasPrevious = computed(() => index.value != null && index.value > 0)
const hasNext = computed(() => index.value != null && index.value < props.pages.length - 1)

const open = computed({
  get: () => page.value != null,
  set: (value) => {
    if (!value) index.value = null
  },
})

const subtitle = computed(() => {
  if (!page.value || index.value == null) return undefined
  const position = `${(index.value + 1).toLocaleString()} of ${props.pages.length.toLocaleString()}`
  return page.value.ago ? `${page.value.ago} · ${position}` : position
})

const html = ref('')
const criteria = ref<string[]>([])
/** Created and last edited: `null` while loading, or when it couldn't load. */
const context = ref<PageContext | null>(null)
const loading = ref(false)
const error = ref(false)
const bodyRef = ref<HTMLElement | null>(null)

let controller: AbortController | null = null

async function load(): Promise<void> {
  controller?.abort()
  html.value = ''
  criteria.value = []
  context.value = null
  error.value = false
  if (!page.value) {
    loading.value = false
    return
  }
  const current = new AbortController()
  controller = current
  loading.value = true
  // The page shows without its context when only the context fails.
  loadPageContext(page.value.title, current.signal).then(
    (found) => {
      if (controller === current) context.value = found
    },
    (err) => {
      if (!current.signal.aborted) console.error(err)
    },
  )
  try {
    const preview = await loadPagePreview(page.value.title, current.signal)
    html.value = preview.html
    criteria.value = preview.criteria
  } catch (err) {
    if (current.signal.aborted) return
    console.error(err)
    error.value = true
  } finally {
    if (controller === current) loading.value = false
  }
}

/* A new page starts at its top. */
watch(
  () => page.value?.key,
  async () => {
    void load()
    await nextTick()
    bodyRef.value?.closest('.cdx-dialog__body')?.scrollTo(0, 0)
  },
  { immediate: true },
)

onBeforeUnmount(() => controller?.abort())

/** The header's edit lines, e.g. "Created 3d ago by …". */
const edits = computed<{ label: string; edit: PageEdit }[]>(() =>
  context.value
    ? [
        { label: 'Created', edit: context.value.created },
        { label: 'Last edited', edit: context.value.lastEdited },
      ]
    : [],
)

function ago(timestamp: string | undefined): string {
  return timestamp ? formatAgo(Date.parse(timestamp)) : 'at an unknown time'
}

function previous(): void {
  if (hasPrevious.value) index.value = (index.value as number) - 1
}

function next(): void {
  if (hasNext.value) index.value = (index.value as number) + 1
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    class="speedy-preview"
    :class="{ 'speedy-preview--mobile': isMobile }"
    :title="page?.title ?? ''"
    use-close-button
    :fixed-height="!isMobile"
  >
    <!-- CODEX+ CdxDialog: the subtitle is text only, so the header is rebuilt with Codex's own classes. -->
    <template #header>
      <div class="speedy-preview__header">
        <div class="cdx-dialog__header__title-group">
          <div class="speedy-preview__title-row">
            <h2 class="cdx-dialog__header__title">{{ page?.title }}</h2>
            <span v-if="page" class="speedy-preview__links">
              <a
                v-if="context?.talk"
                class="speedy-preview__link"
                :class="{ 'speedy-preview__link--new': !context.talk.exists }"
                :href="pageUrl(context.talk.title)"
                target="_blank"
                >Talk</a
              >
              <a class="speedy-preview__link" :href="historyUrl(page.title)" target="_blank"
                >History</a
              >
            </span>
          </div>
          <p class="cdx-dialog__header__subtitle">{{ subtitle }}</p>
          <div class="speedy-preview__context">
            <span v-if="criteria.length" class="speedy-preview__criteria">
              <CdxInfoChip v-for="code in criteria" :key="code">{{ code }}</CdxInfoChip>
            </span>
            <span v-for="{ label, edit } in edits" :key="label">
              {{ label }} {{ ago(edit.timestamp) }}
              <template v-if="edit.user">
                by
                <a
                  class="speedy-preview__link"
                  :class="{ 'speedy-preview__link--new': !edit.hasUserPage }"
                  :href="pageUrl(`User:${edit.user}`)"
                  target="_blank"
                  >{{ edit.user }}</a
                >
              </template>
            </span>
          </div>
        </div>
        <CdxButton
          class="cdx-dialog__header__close-button"
          weight="quiet"
          aria-label="Close"
          @click="open = false"
        >
          <CdxIcon :icon="cdxIconClose" />
        </CdxButton>
      </div>
    </template>

    <div ref="bodyRef" class="speedy-preview__body">
      <CdxProgressBar v-if="loading" inline aria-label="Loading page" />

      <div v-else-if="error" class="speedy-preview__message">
        <p>Couldn't load this page. It may already have been deleted.</p>
        <CdxButton weight="quiet" @click="load">Try again</CdxButton>
      </div>

      <ArticleRenderer v-else :skin="skin">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="html" />
      </ArticleRenderer>
    </div>

    <template #footer>
      <div class="speedy-preview__footer">
        <div class="speedy-preview__nav">
          <CdxButton :disabled="!hasPrevious" @click="previous">
            <CdxIcon :icon="cdxIconPrevious" />
            Previous
          </CdxButton>
          <CdxButton :disabled="!hasNext" @click="next">
            Next
            <CdxIcon :icon="cdxIconNext" />
          </CdxButton>
        </div>
        <div class="speedy-preview__actions">
          <CdxButton>Decline</CdxButton>
          <CdxButton action="destructive" weight="primary">Delete</CdxButton>
        </div>
      </div>
    </template>
  </CdxDialog>
</template>

<style>
/* A page preview wants room: Codex's large dialog width. Full screen on Minerva. */
.speedy-preview.cdx-dialog {
  max-width: min(64rem, calc(100vw - 2 * var(--spacing-100)));
  width: 100%;
}

/*
 * CODEX+ CdxDialog: dividers only when the body scrolls (`cdx-dialog--dividers`).
 * The header carries the page's context, so its divider stays, however short the page.
 */
.speedy-preview .cdx-dialog__header {
  border-bottom: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

.speedy-preview--mobile.cdx-dialog {
  width: 100vw;
  max-width: none;
  height: 100vh;
  height: 100dvh;
  max-height: none;
  border-radius: 0;
}
</style>

<style scoped>
.speedy-preview__body :deep(.article-content) {
  padding-top: 0;
}

/* The default header's layout: title group, then the close button. */
.speedy-preview__header {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
}

/* Body small, a line under the subtitle: the criteria, then the edits. */
.speedy-preview__context {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-25) var(--spacing-100);
  margin-top: var(--spacing-50);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.speedy-preview__criteria {
  display: flex;
  gap: var(--spacing-25);
}

/* The page's own links, at the line's end. */
/* The title, then the page's Talk and History links on its baseline; they wrap under a long title. */
.speedy-preview__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: var(--spacing-100);
}

/* Body small, as the context line. */
.speedy-preview__links {
  display: flex;
  gap: var(--spacing-75);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

/* CODEX+ No CSS-only link in Codex: its link colours, red when the page doesn't exist. */
.speedy-preview__link {
  color: var(--color-progressive);
  text-decoration: none;
}

.speedy-preview__link:hover {
  text-decoration: underline;
}

.speedy-preview__link--new {
  color: var(--color-link-red);
}

.speedy-preview__link--new:hover {
  color: var(--color-link-red--hover);
}

.speedy-preview__message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
  color: var(--color-subtle);
}

.speedy-preview__message p {
  margin: 0;
}

/* Navigation at the start, the decision at the end. They wrap to two rows when narrow. */
.speedy-preview__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75);
  width: 100%;
}

.speedy-preview__nav,
.speedy-preview__actions {
  display: flex;
  gap: var(--spacing-50);
}

.speedy-preview__actions {
  margin-inline-start: auto;
}

/* Minerva: each row runs the full width, its buttons sharing it. */
.speedy-preview--mobile .speedy-preview__nav,
.speedy-preview--mobile .speedy-preview__actions {
  flex: 1 1 100%;
}

.speedy-preview--mobile .speedy-preview__nav .cdx-button,
.speedy-preview--mobile .speedy-preview__actions .cdx-button {
  flex: 1;
  max-width: none;
}
</style>
