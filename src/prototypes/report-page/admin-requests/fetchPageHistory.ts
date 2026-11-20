/**
 * A page's recent history for the protection-request accordions: the newest
 * edits (Action API `prop=revisions`) and the total edit count (REST
 * `history/counts/edits`). Cached per page for the visit.
 */
import { wikimediaApiFetchHeaders } from '@/config'

export const HISTORY_HOST = 'en.wikipedia.org'

/** One line of the history list. */
export interface HistoryEntry {
  revid: number
  /** 0 for the page's first revision. */
  parentid: number
  timestamp: string
  /** Empty when the username is hidden. */
  user: string
  minor: boolean
  /** Page size after the edit, in bytes. */
  size: number
  /** Change in bytes against the previous revision; `null` when unknown. */
  sizeDiff: number | null
  /** Edit summary as HTML, with links pointing at the wiki. */
  parsedComment: string
  tags: string[]
}

export interface PageHistory {
  entries: HistoryEntry[]
  /** Total edits to the page. */
  editCount: number
  /** The count hit the REST endpoint's limit, so the real total is higher. */
  editCountCapped: boolean
}

interface ApiRevision {
  revid: number
  parentid?: number
  timestamp?: string
  user?: string
  userhidden?: boolean
  minor?: boolean
  size?: number
  parsedcomment?: string
  tags?: string[]
}

const cache = new Map<string, Promise<PageHistory>>()

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: wikimediaApiFetchHeaders('report-page') })
  if (!response.ok) throw new Error(`Could not load the page history (HTTP ${response.status}).`)
  return (await response.json()) as T
}

/** Point wiki-relative links in an edit summary at the wiki, in a new tab. */
function absolutizeLinks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? ''
    if (href.startsWith('/') && !href.startsWith('//')) {
      anchor.href = `https://${HISTORY_HOST}${href}`
    }
    anchor.target = '_blank'
    anchor.rel = 'noopener'
  })
  return doc.body.innerHTML
}

async function load(title: string, limit: number, signal?: AbortSignal): Promise<PageHistory> {
  const query = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    titles: title,
    // One more than shown, so the oldest shown edit has a size to compare with.
    rvlimit: String(limit + 1),
    rvprop: 'ids|timestamp|user|flags|size|parsedcomment|tags',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    origin: '*',
  })
  const countPath = encodeURIComponent(title.replace(/ /g, '_'))

  const [revisionsData, countData] = await Promise.all([
    getJson<{ query?: { pages?: { missing?: boolean; revisions?: ApiRevision[] }[] } }>(
      `https://${HISTORY_HOST}/w/api.php?${query}`,
      signal,
    ),
    getJson<{ count?: number; limit?: boolean }>(
      `https://${HISTORY_HOST}/w/rest.php/v1/page/${countPath}/history/counts/edits`,
      signal,
    ).catch(() => ({ count: undefined, limit: false })),
  ])

  const revisions = revisionsData.query?.pages?.[0]?.revisions ?? []
  const entries = revisions.slice(0, limit).map((row, index): HistoryEntry => {
    const older = revisions[index + 1]
    const size = row.size ?? 0
    let sizeDiff: number | null = null
    if (older?.size !== undefined) sizeDiff = size - older.size
    else if (!row.parentid) sizeDiff = size
    return {
      revid: row.revid,
      parentid: row.parentid ?? 0,
      timestamp: row.timestamp ?? '',
      user: row.userhidden ? '' : (row.user ?? ''),
      minor: Boolean(row.minor),
      size,
      sizeDiff,
      parsedComment: absolutizeLinks(row.parsedcomment ?? ''),
      tags: row.tags ?? [],
    }
  })

  return {
    entries,
    editCount: countData.count ?? entries.length,
    editCountCapped: Boolean(countData.limit),
  }
}

/** The newest `limit` edits to `title` and its total edit count. */
export function fetchPageHistory(title: string, limit = 10): Promise<PageHistory> {
  const key = `${title}|${limit}`
  let pending = cache.get(key)
  if (!pending) {
    pending = load(title, limit).catch((error) => {
      cache.delete(key)
      throw error
    })
    cache.set(key, pending)
  }
  return pending
}
