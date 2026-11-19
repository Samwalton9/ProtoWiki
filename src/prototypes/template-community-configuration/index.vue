<script setup lang="ts">
import { cdxIconSettings } from '@wikimedia/codex-icons'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import CommunityConfigurationDashboard from '@/components/community-configuration/CommunityConfigurationDashboard.vue'

import { COMMUNITY_CONFIGURATION_PATH, FEATURES } from './features'

definePage({
  meta: {
    category: 'template',
    platform: 'web',
    icon: cdxIconSettings,
  },
})
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <CommunityConfigurationDashboard
      :features="FEATURES"
      :base-path="COMMUNITY_CONFIGURATION_PATH"
    />
  </ChromeWrapper>
</template>
