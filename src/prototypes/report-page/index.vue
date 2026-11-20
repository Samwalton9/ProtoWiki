<script setup lang="ts">
import { cdxIconFlag } from '@wikimedia/codex-icons'

definePage({
  meta: {
    platform: 'web',
    icon: cdxIconFlag,
  },
})

import { computed, ref } from 'vue'
import { CdxButton, CdxIcon, CdxToast } from '@wikimedia/codex'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import {
  SAVED_PAGES_TEMPLATE_PATH,
  VISUAL_EDITOR_TEMPLATE_PATH,
} from '@/composables/webTemplatePaths'
import { useConfig } from '@/composables/useConfig'
import { useAdminRequests, type ReportDraft } from './adminRequests'
import ReportPageDialog from './ReportPageDialog.vue'
import SpeedyDeletionNotice from './SpeedyDeletionNotice.vue'
import { REPORT_PAGE_PATH, registerAdminRequestsTool } from './reportPageRoutes'

registerAdminRequestsTool()

const { titleFromQuery, setWikiPageTitle } = useWikiPageTitleQuery()

/** Fixed title from `?title=`; omit prop for random article when absent. */
const article = computed(() => titleFromQuery.value)

function onTitleResolved(title: string) {
  if (title?.trim()) setWikiPageTitle(title)
}

const reportOpen = ref(false)
const reportedPage = ref('')
const submittedKind = ref<'protection' | 'deletion' | null>(null)

const { user, displayName } = useConfig()
/** Reporting stands in for autoconfirmed status: editors only, not readers. */
const canReport = computed(() => user.value !== 'logged-out')
const { addRequest, latestDeletionRequest } = useAdminRequests()

/** A deletion request tags the page with {{db}} for its criteria. */
const deletionTag = computed(() =>
  titleFromQuery.value ? latestDeletionRequest(titleFromQuery.value) : null,
)

function onSubmitted(report: ReportDraft) {
  addRequest(report, reportedPage.value, displayName.value)
  submittedKind.value = report.kind
}

function openReport(title: string) {
  reportedPage.value = title
  reportOpen.value = true
}
</script>

<template>
  <ChromeWrapper :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <ArticleLive
      :edit-route="VISUAL_EDITOR_TEMPLATE_PATH"
      :wiki-link-route="REPORT_PAGE_PATH"
      :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH"
      :article="article"
      @title-resolved="onTitleResolved"
    >
      <template #before-content>
        <SpeedyDeletionNotice
          v-if="deletionTag"
          :page="deletionTag.page"
          :criteria="deletionTag.criteria"
        />
      </template>
      <template #page-actions="{ title }">
        <CdxButton
          v-if="canReport"
          weight="quiet"
          aria-label="Report this page"
          title="Report this page"
          @click="openReport(title)"
        >
          <CdxIcon :icon="cdxIconFlag" />
        </CdxButton>
      </template>
    </ArticleLive>

    <ReportPageDialog
      v-model:open="reportOpen"
      :page-title="reportedPage"
      @submitted="onSubmitted"
    />

    <CdxToast
      v-if="submittedKind"
      type="success"
      auto-dismiss
      @user-dismissed="submittedKind = null"
      @auto-dismissed="submittedKind = null"
    >
      Thank you. Your {{ submittedKind }} request for <strong>{{ reportedPage }}</strong> has been
      sent to administrators.
    </CdxToast>
  </ChromeWrapper>
</template>
