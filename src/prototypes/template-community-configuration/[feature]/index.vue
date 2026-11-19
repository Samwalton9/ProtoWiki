<script setup lang="ts">
/**
 * A feature's editor page — `/template-community-configuration/<id>`. An
 * unknown feature goes back to the dashboard.
 */
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import CommunityConfigurationEditor from '@/components/community-configuration/CommunityConfigurationEditor.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

import { COMMUNITY_CONFIGURATION_PATH, FEATURES } from '../features'

const route = useRoute()
const router = useRouter()

const feature = computed(() => {
  const param = (route.params as { feature?: string | string[] }).feature
  const id = String(Array.isArray(param) ? param[0] : (param ?? ''))
  return FEATURES.find((candidate) => candidate.id === id) ?? null
})

watch(
  feature,
  (found) => {
    if (!found) {
      void router.replace({
        path: COMMUNITY_CONFIGURATION_PATH,
        query: preservedQueryFromLocationQuery(route.query),
      })
    }
  },
  { immediate: true },
)
</script>

<template>
  <ChromeWrapper :last-edited-notice="false">
    <CommunityConfigurationEditor
      v-if="feature"
      :feature="feature"
      :base-path="COMMUNITY_CONFIGURATION_PATH"
    />
  </ChromeWrapper>
</template>
