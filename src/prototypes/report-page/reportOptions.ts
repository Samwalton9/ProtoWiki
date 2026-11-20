import type { MenuGroupData } from '@wikimedia/codex'

/** Kinds of protection an editor can request (enwiki's Requests for page protection). */
export const PROTECTION_TYPES = [
  {
    value: 'semi',
    label: 'Semi-protection',
    description: 'Only autoconfirmed accounts can edit the page.',
  },
  {
    value: 'extended',
    label: 'Extended confirmed protection',
    description: 'Only accounts with 30 days and 500 edits can edit the page.',
  },
  {
    value: 'full',
    label: 'Full protection',
    description: 'Only administrators can edit the page.',
  },
  {
    value: 'pending',
    label: 'Pending changes protection',
    description: 'Edits by new and unregistered users need review before readers see them.',
  },
  {
    value: 'move',
    label: 'Move protection',
    description: 'Only administrators can move or rename the page.',
  },
  {
    value: 'unsure',
    label: "I'm not sure",
    description: 'An administrator will choose the right level.',
  },
] as const

export type ProtectionType = (typeof PROTECTION_TYPES)[number]['value']

/**
 * enwiki criteria for speedy deletion that apply to articles. Each `label` is
 * the code (shown on chips); each `description` is the reason. G9 (office
 * actions) and G13 (abandoned drafts) are left out: editors cannot use them
 * on an article.
 */
export const SPEEDY_DELETION_CRITERIA: MenuGroupData[] = [
  {
    label: 'General',
    items: [
      { value: 'G1', label: 'G1', description: 'Patent nonsense' },
      { value: 'G2', label: 'G2', description: 'Test page' },
      { value: 'G3', label: 'G3', description: 'Pure vandalism or blatant hoax' },
      {
        value: 'G4',
        label: 'G4',
        description: 'Recreation of a page deleted after a deletion discussion',
      },
      { value: 'G5', label: 'G5', description: 'Creation by a banned or blocked user' },
      { value: 'G6', label: 'G6', description: 'Technical deletion' },
      { value: 'G7', label: 'G7', description: 'Author requests deletion' },
      { value: 'G8', label: 'G8', description: 'Page dependent on a non-existent or deleted page' },
      {
        value: 'G10',
        label: 'G10',
        description: 'Page that disparages, threatens, intimidates, or harasses',
      },
      { value: 'G11', label: 'G11', description: 'Unambiguous advertising or promotion' },
      { value: 'G12', label: 'G12', description: 'Unambiguous copyright infringement' },
      { value: 'G14', label: 'G14', description: 'Unnecessary disambiguation page' },
      { value: 'G15', label: 'G15', description: 'LLM-generated page without human review' },
    ],
  },
  {
    label: 'Articles',
    items: [
      { value: 'A1', label: 'A1', description: 'No context' },
      {
        value: 'A2',
        label: 'A2',
        description: 'Foreign-language article that exists on another Wikimedia project',
      },
      { value: 'A3', label: 'A3', description: 'No content' },
      {
        value: 'A7',
        label: 'A7',
        description:
          'No indication of importance (people, animals, organizations, web content, events)',
      },
      { value: 'A9', label: 'A9', description: 'No indication of importance (musical recordings)' },
      {
        value: 'A10',
        label: 'A10',
        description: 'Recently created article that duplicates an existing topic',
      },
      { value: 'A11', label: 'A11', description: 'Obviously invented' },
    ],
  },
]

/** Display label for a protection type value. */
export function protectionLabel(value: string): string {
  if (value === 'unsure') return 'Not sure – administrator to choose'
  return PROTECTION_TYPES.find((type) => type.value === value)?.label ?? value
}

/** Display label ("G11: Unambiguous advertising or promotion") for a criterion code. */
export function criterionLabel(code: string): string {
  for (const group of SPEEDY_DELETION_CRITERIA) {
    const item = group.items.find((entry) => entry.value === code)
    if (item) return `${code}: ${item.description}`
  }
  return code
}

/** Criteria whose code or reason contains `query`, without empty groups. */
export function filterCriteria(query: string): MenuGroupData[] {
  const q = query.trim().toLowerCase()
  if (!q) return SPEEDY_DELETION_CRITERIA
  return SPEEDY_DELETION_CRITERIA.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(q),
    ),
  })).filter((group) => group.items.length)
}
