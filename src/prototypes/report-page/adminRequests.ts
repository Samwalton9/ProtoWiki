import { computed, ref } from 'vue'

import { normalizeWikiPageTitleInput } from '@/config'
import type { ProtectionType } from './reportOptions'

/* Its own key, so this prototype's reports don't leak into other prototypes. */
const STORAGE_KEY = 'protowiki-report-page-requests-v1'
const DECLINED_STORAGE_KEY = 'protowiki-report-page-declined-v1'

/** What the editor fills in on the report dialog. */
export type ReportDraft =
  | { kind: 'protection'; protectionType: ProtectionType; reason: string }
  | { kind: 'deletion'; criteria: string[]; details: string }

/** Page signals that help administrators triage a request. */
export type RequestSignal = 'high-activity' | 'high-pageviews'

/** A report as administrators see it on Special:AdminRequests. */
export type AdminRequest = ReportDraft & {
  id: string
  page: string
  reporter: string
  /** ISO timestamp. */
  submitted: string
  /** Mocked: only examples have them. */
  signals?: RequestSignal[]
  /** Other users who requested the same thing, after `reporter`. Mocked on examples. */
  otherReporters?: string[]
}

export type ProtectionRequest = Extract<AdminRequest, { kind: 'protection' }>
export type DeletionRequest = Extract<AdminRequest, { kind: 'deletion' }>

/** Examples that are always on the special page, under the editor's own reports. */
const EXAMPLE_REQUESTS: AdminRequest[] = [
  {
    id: 'example-protection-1',
    kind: 'protection',
    page: 'Taylor Swift',
    protectionType: 'semi',
    reason: 'Persistent vandalism from IP addresses since the tour dates were announced.',
    reporter: 'MusicFan2026',
    otherReporters: ['SwiftieArchivist', 'RecentChangesPatrol'],
    signals: ['high-pageviews'],
    submitted: '2026-11-19T16:42:00Z',
  },
  {
    id: 'example-protection-2',
    kind: 'protection',
    page: 'Climate change',
    protectionType: 'extended',
    reason:
      'Edit war over the lead section between several new accounts. Talk page discussion has stalled.',
    reporter: 'GreenLeafEditor',
    signals: ['high-activity'],
    submitted: '2026-11-18T09:15:00Z',
  },
  {
    id: 'example-protection-3',
    kind: 'protection',
    page: 'Moon landing',
    protectionType: 'move',
    reason: 'Page was moved to a conspiracy-theory title twice this week.',
    reporter: 'Apollo11Watcher',
    submitted: '2026-11-17T21:03:00Z',
  },
  {
    id: 'example-deletion-1',
    kind: 'deletion',
    page: 'Brightwater Smoothie Company',
    criteria: ['G11', 'A7'],
    details: 'Written like a press release, with prices and a discount code.',
    reporter: 'NewPageReviewer7',
    signals: ['high-activity'],
    submitted: '2026-11-19T11:27:00Z',
  },
  {
    id: 'example-deletion-2',
    kind: 'deletion',
    page: 'Kevin Marsh (student)',
    criteria: ['A7'],
    details: '',
    reporter: 'TeaHouseHelper',
    signals: ['high-pageviews'],
    submitted: '2026-11-18T14:50:00Z',
  },
  {
    id: 'example-deletion-3',
    kind: 'deletion',
    page: 'Qwertyuiop asdf',
    criteria: ['G1', 'G2'],
    details: 'Random keyboard text only.',
    reporter: 'CleanupCrew',
    submitted: '2026-11-16T08:05:00Z',
  },
]

function loadSubmitted(): AdminRequest[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as AdminRequest[]).map(migrate) : []
  } catch {
    // Unavailable storage or corrupt JSON — start with no editor reports.
    return []
  }
}

/** Reports saved before multiple criteria: `criterion` becomes `criteria`. */
function migrate(request: AdminRequest & { criterion?: string }): AdminRequest {
  if (request.kind !== 'deletion' || request.criteria) return request
  const { criterion, ...rest } = request
  return { ...rest, criteria: criterion ? [criterion] : [] }
}

function loadDeclined(): string[] {
  try {
    const raw = window.localStorage.getItem(DECLINED_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    // Unavailable storage or corrupt JSON — nothing is declined.
    return []
  }
}

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private mode — the change still shows for this visit.
  }
}

// Module-level: the article page adds reports, the special page reads them.
const submitted = ref<AdminRequest[] | null>(null)
/** Ids of declined requests. Examples cannot be deleted, so they are hidden instead. */
const declined = ref<string[] | null>(null)

/** Reports from the editor (kept in localStorage) and the examples, newest first. */
export function useAdminRequests() {
  if (submitted.value === null) submitted.value = loadSubmitted()
  if (declined.value === null) declined.value = loadDeclined()

  const all = computed(() =>
    [...(submitted.value ?? []), ...EXAMPLE_REQUESTS]
      .filter((request) => !declined.value?.includes(request.id))
      .sort((a, b) => b.submitted.localeCompare(a.submitted)),
  )
  const protectionRequests = computed(() =>
    all.value.filter((request): request is ProtectionRequest => request.kind === 'protection'),
  )
  const deletionRequests = computed(() =>
    all.value.filter((request): request is DeletionRequest => request.kind === 'deletion'),
  )

  /** The newest deletion request for `page`, or `null`. The page shows it as a {{db}} tag. */
  function latestDeletionRequest(page: string): DeletionRequest | null {
    const key = normalizeWikiPageTitleInput(page)
    return (
      deletionRequests.value.find((request) => normalizeWikiPageTitleInput(request.page) === key) ??
      null
    )
  }

  function addRequest(draft: ReportDraft, page: string, reporter: string): void {
    const request = {
      ...draft,
      id: `request-${Date.now()}`,
      page,
      reporter,
      submitted: new Date().toISOString(),
    } as AdminRequest
    submitted.value = [request, ...(submitted.value ?? [])]
    save(STORAGE_KEY, submitted.value)
  }

  /** Decline a request: it leaves the queue (and a {{db}} tag leaves its page). */
  function declineRequest(id: string): void {
    declined.value = [...new Set([...(declined.value ?? []), id])]
    save(DECLINED_STORAGE_KEY, declined.value)
  }

  /** Put a declined request back in the queue. */
  function restoreRequest(id: string): void {
    declined.value = (declined.value ?? []).filter((entry) => entry !== id)
    save(DECLINED_STORAGE_KEY, declined.value)
  }

  /** Back to the default queue: only the examples, none declined, no editor reports. */
  function resetToExamples(): void {
    submitted.value = []
    declined.value = []
    save(STORAGE_KEY, submitted.value)
    save(DECLINED_STORAGE_KEY, declined.value)
  }

  /** True when the queue is already in its default state. */
  const isDefault = computed(() => !submitted.value?.length && !declined.value?.length)

  return {
    protectionRequests,
    deletionRequests,
    latestDeletionRequest,
    addRequest,
    declineRequest,
    restoreRequest,
    resetToExamples,
    isDefault,
  }
}
