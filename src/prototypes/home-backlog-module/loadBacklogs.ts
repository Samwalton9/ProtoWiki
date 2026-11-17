/**
 * Backlogs: English Wikipedia's admin backlog categories, largest first, and the
 * pages waiting in each. Both are live and never cached: backlogs move all day.
 */

import { wikimediaApiFetchHeaders } from '@/config'

import { formatAgo } from './relativeTime'

/* The Home's lookups are English Wikipedia's. */
const HOST = 'en.wikipedia.org'

/** More pages than this, and the category is backlogged right now. */
export const BACKLOG_THRESHOLD = 50

/** Pages listed on a category's own page — the Action API's most per call. */
const PAGE_LIMIT = 500

export interface BacklogCategory {
  /** URL segment of the category's page, `/<home>/backlog/<id>`. */
  id: string
  label: string
  /** Full category title, with its namespace. */
  title: string
}

export const BACKLOG_CATEGORIES: readonly BacklogCategory[] = [
  {
    id: 'speedy-deletion',
    label: 'Candidates for speedy deletion',
    title: 'Category:Candidates for speedy deletion',
  },
  {
    id: 'unblock-requests',
    label: 'Requests for unblock',
    title: 'Category:Requests for unblock',
  },
  {
    id: 'copyright-problems',
    label: 'Pages tagged for copyright problems',
    title: 'Category:Wikipedia pages tagged for copyright problems',
  },
]

/** One backlog category, as a backlog card shows it. */
export interface BacklogCard extends BacklogCategory {
  /** Pages and files in it (subcategories not counted). */
  count: number
  backlogged: boolean
}

/** One page waiting in a backlog category. */
export interface BacklogPage {
  key: string
  title: string
  /** The page on Wikipedia. */
  href: string
  /** When it joined the category, e.g. "3h ago". */
  ago: string
}

interface ApiCategoryInfo {
  pages?: number
  files?: number
}

interface ApiCategoryMember {
  pageid: number
  title: string
  timestamp?: string
}

async function action<T>(params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const search = new URLSearchParams({ ...params, format: 'json', formatversion: '2', origin: '*' })
  const response = await fetch(`https://${HOST}/w/api.php?${search.toString()}`, {
    signal,
    headers: wikimediaApiFetchHeaders('home-backlogs'),
  })
  if (!response.ok) throw new Error(`Failed to load backlogs (HTTP ${response.status}).`)
  return (await response.json()) as T
}

export function pageUrl(title: string): string {
  return `https://${HOST}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export function backlogCategory(id: string): BacklogCategory | undefined {
  return BACKLOG_CATEGORIES.find((category) => category.id === id)
}

/** Each backlog category's size, in one call, largest first. */
export async function loadBacklogCards(signal: AbortSignal): Promise<BacklogCard[]> {
  const data = await action<{
    query?: { pages?: { title: string; categoryinfo?: ApiCategoryInfo }[] }
  }>(
    {
      action: 'query',
      prop: 'categoryinfo',
      titles: BACKLOG_CATEGORIES.map((category) => category.title).join('|'),
    },
    signal,
  )
  const info = new Map((data.query?.pages ?? []).map((page) => [page.title, page.categoryinfo]))

  return BACKLOG_CATEGORIES.map((category) => {
    const found = info.get(category.title)
    const count = (found?.pages ?? 0) + (found?.files ?? 0)
    return { ...category, count, backlogged: count > BACKLOG_THRESHOLD }
  }).sort((a, b) => b.count - a.count)
}

/** The pages in one backlog category, newest to join first. */
export async function loadBacklogPages(
  category: BacklogCategory,
  signal: AbortSignal,
): Promise<BacklogPage[]> {
  const data = await action<{ query?: { categorymembers?: ApiCategoryMember[] } }>(
    {
      action: 'query',
      list: 'categorymembers',
      cmtitle: category.title,
      cmtype: 'page|file',
      cmprop: 'ids|title|timestamp',
      cmsort: 'timestamp',
      cmdir: 'desc',
      cmlimit: String(PAGE_LIMIT),
    },
    signal,
  )
  return (data.query?.categorymembers ?? []).map((member) => ({
    key: String(member.pageid),
    title: member.title,
    href: pageUrl(member.title),
    ago: member.timestamp ? `Added ${formatAgo(Date.parse(member.timestamp))}` : '',
  }))
}
