/**
 * The features this wiki's Community Configuration lists. None to start with:
 * a prototype that copies this template declares its own.
 */
import type { CommunityConfigurationFeature } from '@/components/community-configuration/types'

/** The dashboard's own route (file-based, `template-community-configuration/index.vue`). */
export const COMMUNITY_CONFIGURATION_PATH = '/template-community-configuration'

export const FEATURES: readonly CommunityConfigurationFeature[] = []
