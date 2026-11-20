<script setup lang="ts">
/**
 * The {{db}} speedy deletion tag (https://en.wikipedia.org/wiki/Template:Db)
 * for the chosen criteria. The Action API parses the real template, so the box
 * and its TemplateStyles match production. Links open on the wiki; the
 * "Contest this speedy deletion" form does nothing.
 */
import { ref, watch } from 'vue'

import { wikimediaApiFetchHeaders } from '@/config'
import { SPEEDY_DELETION_CRITERIA } from './reportOptions'

const props = withDefaults(
  defineProps<{
    page: string
    criteria: string[]
    host?: string
  }>(),
  { host: 'en.wikipedia.org' },
)

const html = ref<string | null>(null)
const cache = new Map<string, string>()

/** "[[WP:CSD#G11|G11]]: Unambiguous advertising or promotion; …" */
function reasonWikitext(codes: string[]): string {
  return codes
    .map((code) => {
      const item = SPEEDY_DELETION_CRITERIA.flatMap((group) => group.items).find(
        (entry) => entry.value === code,
      )
      const link = `[[WP:CSD#${code}|${code}]]`
      return item?.description ? `${link}: ${item.description}` : link
    })
    .join('; ')
}

/** Point wiki-relative links at the wiki, in a new tab. */
function absolutizeLinks(raw: string, host: string): string {
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('/') && !href.startsWith('//')) anchor.href = `https://${host}${href}`
    anchor.target = '_blank'
    anchor.rel = 'noopener'
  })
  return doc.body.innerHTML
}

async function load(page: string, criteria: string[], host: string, signal: AbortSignal) {
  const text = `{{db|${reasonWikitext(criteria)}}}`
  const key = `${host}|${page}|${text}`
  const cached = cache.get(key)
  if (cached) {
    html.value = cached
    return
  }
  const query = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    origin: '*',
    prop: 'text',
    disablelimitreport: '1',
    title: page,
    text,
  })
  try {
    const response = await fetch(`https://${host}/w/api.php?${query}`, {
      signal,
      headers: wikimediaApiFetchHeaders('report-page'),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    const parsed = absolutizeLinks(data?.parse?.text ?? '', host)
    cache.set(key, parsed)
    html.value = parsed
  } catch {
    // Aborted or offline — show no tag rather than a broken one.
    if (!signal.aborted) html.value = null
  }
}

watch(
  () => [props.page, props.criteria.join('|'), props.host] as const,
  (_value, _old, onCleanup) => {
    html.value = null
    if (!props.page || !props.criteria.length) return
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    void load(props.page, props.criteria, props.host, controller.signal)
  },
  { immediate: true },
)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="html" class="speedy-deletion-notice" @submit.prevent v-html="html" />
</template>

<style scoped>
.speedy-deletion-notice {
  margin-bottom: var(--spacing-100, 16px);
}

/* InputBox's `ext.inputBox.styles` is not loaded: center the contest button as it does. */
.speedy-deletion-notice :deep(.mw-inputbox-centered) {
  margin-inline: auto;
  text-align: center;
}
</style>
