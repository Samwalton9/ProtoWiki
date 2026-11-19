/**
 * Speedy deletion: English Wikipedia's candidates for speedy deletion, newest
 * to join first, and each candidate's rendered page for the preview. All live
 * and never cached: the queue moves all day, and its pages change as it does.
 */

import { wikimediaApiFetchHeaders } from '@/config'
import { extractParserOutput } from '@/components/article/shared/fetchArticleBody'

import { formatAgo } from './relativeTime'

/* The Home's lookups are English Wikipedia's. */
const HOST = 'en.wikipedia.org'

const CATEGORY = 'Category:Candidates for speedy deletion'

/** More pages than this, and the queue is backlogged right now. */
export const BACKLOG_THRESHOLD = 50

/** Pages in the queue — the Action API's most per call. */
const PAGE_LIMIT = 500

/** One page waiting for speedy deletion. */
export interface SpeedyDeletionPage {
  key: string
  title: string
  /** The page on Wikipedia. */
  href: string
  /** When it joined the queue, e.g. "Added 3h ago". */
  ago: string
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
    headers: wikimediaApiFetchHeaders('home-speedy-deletion'),
  })
  if (!response.ok) throw new Error(`Failed to load speedy deletion (HTTP ${response.status}).`)
  return (await response.json()) as T
}

export function pageUrl(title: string): string {
  return `https://${HOST}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

export function historyUrl(title: string): string {
  return `https://${HOST}/w/index.php?${new URLSearchParams({ title, action: 'history' }).toString()}`
}

/** The pages in the queue, newest to join first. */
export async function loadSpeedyDeletionPages(signal: AbortSignal): Promise<SpeedyDeletionPage[]> {
  const data = await action<{ query?: { categorymembers?: ApiCategoryMember[] } }>(
    {
      action: 'query',
      list: 'categorymembers',
      cmtitle: CATEGORY,
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

/** One candidate's rendered page, with the criteria its deletion tag names (e.g. "G15"). */
export interface PagePreview {
  html: string
  criteria: string[]
}

/** One edit's time and editor. */
export interface PageEdit {
  timestamp?: string
  /** Unset when the editor's name is hidden. */
  user?: string
  /** Whether the editor's user page exists. */
  hasUserPage: boolean
}

/** Who made the page and who touched it last. */
export interface PageContext {
  created: PageEdit
  lastEdited: PageEdit
  /** The page's talk page; unset when the page is a talk page itself. */
  talk?: { title: string; exists: boolean }
}

interface ApiRevision {
  timestamp?: string
  user?: string
  userhidden?: boolean
}

/**
 * The criteria a page's deletion tag names. `{{db-meta}}` writes each one into
 * a hidden `delete-criterion` span (Twinkle reads it too). Without it, the
 * tag's "See CSD G15" links to WP:CSD still name the codes.
 */
function criteriaFromHtml(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const found = new Set<string>()
  doc.querySelectorAll('[id="delete-criterion"]').forEach((node) => {
    for (const code of (node.textContent ?? '').toUpperCase().match(/[A-Z]\d+/g) ?? []) {
      found.add(code)
    }
  })
  if (!found.size) {
    doc.querySelectorAll('a[href*="Speedy_deletion#"]').forEach((link) => {
      const code = link.getAttribute('href')?.split('#')[1]?.toUpperCase()
      if (code && /^[A-Z]\d+$/.test(code)) found.add(code)
    })
  }
  return [...found]
}

/** One candidate's rendered page (REST `page/html`), its deletion tag included. */
export async function loadPagePreview(title: string, signal: AbortSignal): Promise<PagePreview> {
  const response = await fetch(
    `https://${HOST}/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    {
      signal,
      headers: {
        Accept: 'text/html; charset=utf-8',
        ...wikimediaApiFetchHeaders('home-speedy-deletion'),
      },
    },
  )
  if (!response.ok) throw new Error(`Failed to load ${title} (HTTP ${response.status}).`)
  const html = extractParserOutput(await response.text())
  return { html, criteria: criteriaFromHtml(html) }
}

interface ApiPage {
  ns?: number
  revisions?: ApiRevision[]
  /** Set only when the talk page exists. */
  talkid?: number
  /** The talk page for a subject page, the subject page for a talk page. */
  associatedpage?: string
}

/** A page with its first or latest revision, and its talk page. */
async function revision(
  title: string,
  dir: 'newer' | 'older',
  signal: AbortSignal,
): Promise<ApiPage | undefined> {
  const data = await action<{ query?: { pages?: ApiPage[] } }>(
    {
      action: 'query',
      prop: 'revisions|info',
      inprop: 'talkid|associatedpage',
      titles: title,
      rvprop: 'timestamp|user',
      rvlimit: '1',
      rvdir: dir,
    },
    signal,
  )
  return data.query?.pages?.[0]
}

/** Which of these users have a user page. */
async function usersWithUserPages(users: string[], signal: AbortSignal): Promise<Set<string>> {
  if (!users.length) return new Set()
  const data = await action<{
    query?: {
      normalized?: { from: string; to: string }[]
      pages?: { title: string; missing?: boolean }[]
    }
  }>({ action: 'query', titles: users.map((user) => `User:${user}`).join('|') }, signal)
  const existing = new Set(
    (data.query?.pages ?? []).filter((page) => !page.missing).map((page) => page.title),
  )
  const normalized = new Map(
    (data.query?.normalized ?? []).map((entry) => [entry.from, entry.to] as const),
  )
  return new Set(
    users.filter((user) => {
      const title = `User:${user}`
      return existing.has(normalized.get(title) ?? title)
    }),
  )
}

/**
 * When the page was created and last edited, by whom, and whether they have
 * user pages; and its talk page, and whether that exists.
 */
export async function loadPageContext(title: string, signal: AbortSignal): Promise<PageContext> {
  const [firstPage, page] = await Promise.all([
    revision(title, 'newer', signal),
    revision(title, 'older', signal),
  ])
  const first = firstPage?.revisions?.[0]
  const latest = page?.revisions?.[0]
  // Talk namespaces are the odd ones.
  const isTalk = (page?.ns ?? 0) % 2 === 1
  const creator = first?.userhidden ? undefined : first?.user
  const lastEditor = latest?.userhidden ? undefined : latest?.user
  const users = [...new Set([creator, lastEditor].filter((user): user is string => !!user))]
  const withUserPages = await usersWithUserPages(users, signal)
  return {
    created: {
      timestamp: first?.timestamp,
      user: creator,
      hasUserPage: !!creator && withUserPages.has(creator),
    },
    lastEdited: {
      timestamp: latest?.timestamp,
      user: lastEditor,
      hasUserPage: !!lastEditor && withUserPages.has(lastEditor),
    },
    talk:
      page?.associatedpage && !isTalk
        ? { title: page.associatedpage, exists: page.talkid != null }
        : undefined,
  }
}
