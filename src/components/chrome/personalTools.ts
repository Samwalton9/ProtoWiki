import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'
import type { Icon } from '@wikimedia/codex-icons'

/**
 * Extra personal-tools rows that a prototype adds to the chrome.
 *
 * Vector: when rows are registered, the user avatar opens a menu with these
 * rows and a "Mock user settings" row. Minerva: the rows show in the main menu.
 * Both skins show the rows to logged-in users only. With nothing registered,
 * the chrome is unchanged.
 *
 * Module-level rather than provide/inject, like `accountActions`.
 */
export interface PersonalTool {
  id: string
  label: string
  icon?: Icon
  /** In-app route path. The chrome keeps the shared query (skin, theme, …). */
  path: string
}

/** The rows the current page registered. */
export const personalTools: ShallowRef<PersonalTool[]> = shallowRef([])

let owner: symbol | null = null

/** Register rows for the lifetime of the calling component. Call in `<script setup>`. */
export function registerPersonalTools(tools: PersonalTool[]): void {
  const token = Symbol('personal-tools')
  owner = token
  personalTools.value = tools
  onScopeDispose(() => {
    if (owner !== token) return
    owner = null
    personalTools.value = []
  })
}
