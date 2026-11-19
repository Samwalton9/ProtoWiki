/**
 * The Home's Community Configuration: the features its admins configure, at
 * `/home-backlog-module/community-configuration`.
 */
import type { CommunityConfigurationFeature } from '@/components/community-configuration/types'

import { HOME_PATH } from './homeRoutes'

export const COMMUNITY_CONFIGURATION_PATH = `${HOME_PATH}/community-configuration`

export const FEATURES: readonly CommunityConfigurationFeature[] = [
  {
    id: 'GrowthBacklogs',
    title: 'Backlogs',
    description: "Customize the newcomer homepage's Backlogs module.",
    intro:
      'The backlogs the Backlogs module can show, and how many pages it takes for each to be flagged as Backlogged.',
  },
]
