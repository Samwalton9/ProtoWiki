import { computed, ref } from 'vue'

/* Its own key, so these options don't leak into other prototypes. */
const STORAGE_KEY = 'protowiki-report-page-admin-options-v1'

/** Features of Special:AdminRequests that the overflow menu turns on and off. */
export type PrototypeOption = 'signals' | 'history'

const DEFAULT_OPTIONS: PrototypeOption[] = []

function loadOptions(): PrototypeOption[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? (parsed as PrototypeOption[]) : DEFAULT_OPTIONS
  } catch {
    // Unavailable storage or corrupt JSON — use the defaults.
    return DEFAULT_OPTIONS
  }
}

const enabled = ref<PrototypeOption[]>(loadOptions())

/** The options that are on, kept in localStorage. */
export function usePrototypeOptions() {
  const options = computed({
    get: () => enabled.value,
    set: (value: PrototypeOption[]) => {
      enabled.value = value
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // Quota or private mode — the choice still works for this visit.
      }
    },
  })
  const showSignals = computed(() => enabled.value.includes('signals'))
  const showHistory = computed(() => enabled.value.includes('history'))
  return { options, showSignals, showHistory }
}
