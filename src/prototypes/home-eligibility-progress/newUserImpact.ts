/**
 * The New mock user's impact: 7 edits over their first two days, to match their
 * progress to Autoconfirmed (`HomeAutoconfirmedProgress.vue`). Illustrative.
 */

import type { ImpactData } from '../template-homepage/impact/data/impactTypes'

/** Daily edits, oldest first: none, then 4 yesterday and 3 today. */
const RECENT_ACTIVITY = [...Array<number>(58).fill(0), 4, 3]

export const NEW_USER_IMPACT: ImpactData = {
  totalEdits: 7,
  thanksReceived: 0,
  lastEdited: 'Today',
  longestStreak: '2 days',
  viewCount: '1,240',
  sparklineData: [110, 124, 118, 131, 126, 140, 122, 135, 129, 125],
  recentActivityData: RECENT_ACTIVITY,
  activityStartDate: 'Sep 15',
  activityEndDate: 'Nov 13',
  mostViewed: [
    {
      title: 'Common blackbird',
      views: 812,
      sparklineData: [80, 85, 78, 90, 84, 79, 88, 82, 86, 81],
      href: '#',
    },
    {
      title: 'Lichen',
      views: 356,
      sparklineData: [34, 36, 33, 38, 35, 37, 34, 36, 35, 37],
      href: '#',
    },
    {
      title: 'Tram stop',
      views: 72,
      sparklineData: [7, 8, 6, 8, 7, 7, 8, 6, 7, 8],
      href: '#',
    },
  ],
  viewAllEditsHref: '#',
}
