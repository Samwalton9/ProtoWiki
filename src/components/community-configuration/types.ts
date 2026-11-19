/**
 * A feature that communities configure through Community Configuration — one
 * "configuration provider" in the extension's terms. Each prototype declares
 * its own; the dashboard lists them, and each gets an editor page.
 */
export interface CommunityConfigurationFeature {
  /** URL segment of its editor page, e.g. `GrowthHomepage` (PascalCase, as on wiki). */
  id: string
  /** Display name, e.g. "Newcomer onboarding". The editor page is "Editing <title>". */
  title: string
  /** One line for the dashboard's feature list. */
  description: string
  /** The editor page's intro. Defaults to `description`. */
  intro?: string
  /** The editor page's Help link. */
  helpUrl?: string
  /**
   * The JSON page that stores its configuration on Wikipedia, e.g.
   * `MediaWiki:GrowthExperimentsHomepage.json`. "View history" links to its
   * history; without it, the tab goes nowhere.
   */
  configPage?: string
}
