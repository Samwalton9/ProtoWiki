<script setup lang="ts">
definePage({
  meta: {
    platform: 'web',
  },
})

import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  CdxAccordion,
  CdxButton,
  CdxCard,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMenuButton,
  CdxSelect,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxToast,
  type MenuGroupData,
  type MenuItemData,
  type TableColumn,
  type TableSort,
} from '@wikimedia/codex'

import { cdxIconEllipsis } from '@wikimedia/codex-icons'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useSkin } from '@/composables/useSkin'
import { SAVED_PAGES_TEMPLATE_PATH } from '@/composables/webTemplatePaths'
import {
  useAdminRequests,
  type AdminRequest,
  type ProtectionRequest,
  type RequestSignal,
} from '../adminRequests'
import {
  criterionLabel,
  PROTECTION_TYPES,
  protectionLabel,
  SPEEDY_DELETION_CRITERIA,
} from '../reportOptions'
import { registerAdminRequestsTool, REPORT_PAGE_PATH } from '../reportPageRoutes'
import RequestReporters from '../RequestReporters.vue'
import RequestSignals from '../RequestSignals.vue'
import { REQUEST_SIGNALS } from '../requestSignals'
import PageHistory from './PageHistory.vue'
import ProtectPageDialog from './ProtectPageDialog.vue'
import { usePrototypeOptions } from './usePrototypeOptions'

registerAdminRequestsTool()

const route = useRoute()
const {
  protectionRequests,
  deletionRequests,
  declineRequest,
  restoreRequest,
  resetToExamples,
  isDefault,
} = useAdminRequests()

/** The request just declined, for the toast and its Undo. */
const lastDeclined = ref<AdminRequest | null>(null)
/** Toast text around the page name: what was done, and any detail after. */
const lastAction = ref({ before: '', after: '' })

/** The request waiting for confirmation in the Decline dialog. */
const pendingDecline = ref<AdminRequest | null>(null)
const confirmOpen = computed({
  get: () => pendingDecline.value !== null,
  set: (open: boolean) => {
    if (!open) pendingDecline.value = null
  },
})

function decline(request: AdminRequest): void {
  pendingDecline.value = request
}

function confirmDecline(): void {
  const request = pendingDecline.value
  pendingDecline.value = null
  if (!request) return
  declineRequest(request.id)
  lastDeclined.value = request
  lastAction.value = { before: `Declined the ${request.kind} request for`, after: '' }
}

/** The request whose Protect dialog is open ("Page history" option only). */
const protecting = ref<ProtectionRequest | null>(null)

/** Protecting resolves the request: it leaves the queue like a declined one. */
function onProtected(summary: string): void {
  const request = protecting.value
  protecting.value = null
  if (!request) return
  declineRequest(request.id)
  lastDeclined.value = request
  lastAction.value = { before: 'Protected', after: `: ${summary}` }
}

function undoDecline(): void {
  if (lastDeclined.value) restoreRequest(lastDeclined.value.id)
  lastDeclined.value = null
}

const activeTab = ref<'protection' | 'deletion'>('protection')

/** Tables are hard to scan on narrow screens: Minerva gets stacked lists instead. */
const skin = useSkin()
const useList = computed(() => skin.value === 'mobile')

const ALL = 'all'

/** Page-signal filter, one per tab. */
const SIGNAL_FILTER_ITEMS: MenuItemData[] = [
  { value: ALL, label: 'Any' },
  ...(Object.keys(REQUEST_SIGNALS) as RequestSignal[]).map((signal) => ({
    value: signal,
    label: REQUEST_SIGNALS[signal].label,
    icon: REQUEST_SIGNALS[signal].icon,
  })),
]
const protectionSignalFilter = ref<string>(ALL)
const deletionSignalFilter = ref<string>(ALL)

/**
 * The page's overflow menu: prototyping toggles (checked when on), then
 * one-off actions that run on click and never stay checked.
 */
const { options, showSignals, showHistory } = usePrototypeOptions()
const RESET = 'reset'
/** Protection requests whose accordion is open; history loads only once opened. */
const openAccordions = ref<string[]>([])

function setAccordionOpen(id: string, open: boolean): void {
  openAccordions.value = open
    ? [...openAccordions.value, id]
    : openAccordions.value.filter((entry) => entry !== id)
}

const optionItems = computed((): MenuGroupData[] => [
  {
    label: 'Prototype options',
    items: [
      { value: 'signals', label: 'Signals' },
      { value: 'history', label: 'Page history' },
    ],
  },
  {
    label: 'Actions',
    items: [
      {
        value: RESET,
        label: 'Reset to example requests',
        disabled: isDefault.value,
      },
    ],
  },
])

function onOptionsSelect(selected: string[]): void {
  if (selected.includes(RESET)) {
    resetToExamples()
    lastDeclined.value = null
    return
  }
  options.value = selected as typeof options.value
}

/** A hidden signal filter matches everything, so it cannot hide rows unseen. */
function hasSignal(request: AdminRequest, signal: string): boolean {
  if (!showSignals.value || signal === ALL) return true
  return (request.signals ?? []).includes(signal as RequestSignal)
}

const protectionFilter = ref<string>(ALL)
const PROTECTION_FILTER_ITEMS: MenuItemData[] = [
  { value: ALL, label: 'All levels' },
  ...PROTECTION_TYPES.map((type) => ({ value: type.value, label: protectionLabel(type.value) })),
]
const filteredProtectionRequests = computed(() =>
  protectionRequests.value.filter(
    (request) =>
      (protectionFilter.value === ALL || request.protectionType === protectionFilter.value) &&
      hasSignal(request, protectionSignalFilter.value),
  ),
)

const criterionFilter = ref<string>(ALL)
const CRITERION_FILTER_ITEMS: (MenuItemData | MenuGroupData)[] = [
  { value: ALL, label: 'All criteria' },
  ...SPEEDY_DELETION_CRITERIA.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      value: item.value,
      label: criterionLabel(String(item.value)),
    })),
  })),
]
/** A request matches when any of its criteria is the chosen one. */
const filteredDeletionRequests = computed(() =>
  deletionRequests.value.filter(
    (request) =>
      (criterionFilter.value === ALL || request.criteria.includes(criterionFilter.value)) &&
      hasSignal(request, deletionSignalFilter.value),
  ),
)

/** Only Date sorts. The lists arrive newest first, which is also the default. */
type DateSort = TableSort<'submitted'>

function reporterCount(request: AdminRequest): number {
  return 1 + (request.otherReporters?.length ?? 0)
}

/** Most-reported pages first; Date (the table's sort) breaks ties. */
function sortByDate<T extends AdminRequest>(requests: T[], sort: DateSort): T[] {
  const byDate = sort.submitted === 'asc' ? [...requests].reverse() : [...requests]
  // Stable sort: equal counts keep the date order.
  return byDate.sort((a, b) => reporterCount(b) - reporterCount(a))
}

const protectionSort = ref<DateSort>({ submitted: 'desc' })
const sortedProtectionRequests = computed(() =>
  sortByDate(filteredProtectionRequests.value, protectionSort.value),
)

const deletionSort = ref<DateSort>({ submitted: 'desc' })
const sortedDeletionRequests = computed(() =>
  sortByDate(filteredDeletionRequests.value, deletionSort.value),
)

const PROTECTION_COLUMNS: TableColumn[] = [
  { id: 'page', label: 'Page' },
  { id: 'protectionType', label: 'Requested protection' },
  { id: 'reason', label: 'Reason' },
  { id: 'reporter', label: 'Requested by' },
  { id: 'submitted', label: 'Date', allowSort: true },
  { id: 'actions', label: 'Actions' },
]

const DELETION_COLUMNS: TableColumn[] = [
  { id: 'page', label: 'Page' },
  { id: 'criteria', label: 'Criteria' },
  { id: 'details', label: 'Additional information' },
  { id: 'reporter', label: 'Requested by' },
  { id: 'submitted', label: 'Date', allowSort: true },
  { id: 'actions', label: 'Actions' },
]

function pageTo(title: string) {
  return {
    path: REPORT_PAGE_PATH,
    query: { ...preservedQueryFromLocationQuery(route.query), title },
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <ChromeWrapper :last-edited-notice="false" :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH">
    <SpecialPageWrapper title="Special:AdminRequests">
      <template #actions>
        <CdxMenuButton
          :selected="options"
          :menu-items="optionItems"
          @update:selected="onOptionsSelect"
          aria-label="Prototype options"
        >
          <CdxIcon :icon="cdxIconEllipsis" />
        </CdxMenuButton>
      </template>
      <p>Protection and deletion requests from editors, waiting for administrator review.</p>

      <CdxTabs v-model:active="activeTab">
        <CdxTab name="protection" :label="`Protection requests (${protectionRequests.length})`">
          <div class="admin-requests__filters">
            <CdxField>
              <template #label>Requested protection</template>
              <CdxSelect
                v-model:selected="protectionFilter"
                :menu-items="PROTECTION_FILTER_ITEMS"
              />
            </CdxField>
            <CdxField v-if="showSignals">
              <template #label>Page signal</template>
              <CdxSelect
                v-model:selected="protectionSignalFilter"
                :menu-items="SIGNAL_FILTER_ITEMS"
              />
            </CdxField>
          </div>
          <!-- "Page history" option: one accordion per request, with the page's recent edits. -->
          <template v-if="showHistory">
            <div v-if="sortedProtectionRequests.length" class="admin-requests__accordions">
              <CdxAccordion
                v-for="request in sortedProtectionRequests"
                :key="request.id"
                :model-value="openAccordions.includes(request.id)"
                @update:model-value="setAccordionOpen(request.id, $event)"
              >
                <template #title>{{ request.page }}</template>
                <template #description>
                  {{ protectionLabel(request.protectionType) }} ·
                  {{ formatDate(request.submitted) }}
                  <RequestSignals v-if="showSignals" :signals="request.signals" />
                </template>
                <dl class="admin-requests__fields">
                  <dt>Page</dt>
                  <dd>
                    <RouterLink :to="pageTo(request.page)">{{ request.page }}</RouterLink>
                  </dd>
                  <dt>Reason</dt>
                  <dd>{{ request.reason }}</dd>
                  <dt>Requested by</dt>
                  <dd>
                    <RequestReporters
                      :reporter="request.reporter"
                      :others="request.otherReporters"
                    />
                  </dd>
                </dl>
                <div class="admin-requests__actions">
                  <CdxButton
                    action="progressive"
                    :aria-label="`Protect ${request.page}`"
                    @click="protecting = request"
                  >
                    Protect
                  </CdxButton>
                  <CdxButton
                    :aria-label="`Decline the request for ${request.page}`"
                    @click="decline(request)"
                  >
                    Decline
                  </CdxButton>
                </div>
                <PageHistory v-if="openAccordions.includes(request.id)" :page="request.page" />
              </CdxAccordion>
            </div>
            <p v-else class="admin-requests__empty">
              {{
                protectionFilter === ALL && (!showSignals || protectionSignalFilter === ALL)
                  ? 'No protection requests.'
                  : 'No protection requests match these filters.'
              }}
            </p>
          </template>
          <template v-else-if="useList">
            <ul v-if="filteredProtectionRequests.length" class="admin-requests__list">
              <li
                v-for="request in sortedProtectionRequests"
                :key="request.id"
                class="admin-requests__item"
              >
                <CdxCard>
                  <template #title>
                    <RouterLink :to="pageTo(request.page)">{{ request.page }}</RouterLink>
                  </template>
                  <template #description>
                    {{ formatDate(request.submitted) }}
                    <RequestSignals v-if="showSignals" :signals="request.signals" />
                  </template>
                  <template #supporting-text>
                    <dl class="admin-requests__fields">
                      <dt>Requested protection</dt>
                      <dd>{{ protectionLabel(request.protectionType) }}</dd>
                      <dt>Reason</dt>
                      <dd>{{ request.reason }}</dd>
                      <dt>Requested by</dt>
                      <dd>
                        <RequestReporters
                          :reporter="request.reporter"
                          :others="request.otherReporters"
                        />
                      </dd>
                    </dl>
                    <CdxButton
                      class="admin-requests__decline"
                      :aria-label="`Decline the request for ${request.page}`"
                      @click="decline(request)"
                    >
                      Decline
                    </CdxButton>
                  </template>
                </CdxCard>
              </li>
            </ul>
            <p v-else class="admin-requests__empty">
              {{
                protectionFilter === ALL && (!showSignals || protectionSignalFilter === ALL)
                  ? 'No protection requests.'
                  : 'No protection requests match these filters.'
              }}
            </p>
          </template>
          <CdxTable
            v-else
            caption="Protection requests"
            hide-caption
            :columns="PROTECTION_COLUMNS"
            :data="sortedProtectionRequests"
            v-model:sort="protectionSort"
          >
            <template #item-page="{ item, row }">
              <RouterLink :to="pageTo(item)">{{ item }}</RouterLink>
              <RequestSignals v-if="showSignals" :signals="row.signals" />
            </template>
            <template #item-protectionType="{ item }">
              {{ protectionLabel(item) }}
            </template>
            <template #item-reporter="{ item, row }">
              <RequestReporters :reporter="item" :others="row.otherReporters" />
            </template>
            <template #item-actions="{ row }">
              <CdxButton :aria-label="`Decline the request for ${row.page}`" @click="decline(row)">
                Decline
              </CdxButton>
            </template>
            <template #item-submitted="{ item }">
              {{ formatDate(item) }}
            </template>
            <template #empty-state>
              {{
                protectionFilter === ALL && (!showSignals || protectionSignalFilter === ALL)
                  ? 'No protection requests.'
                  : 'No protection requests match these filters.'
              }}
            </template>
          </CdxTable>
        </CdxTab>

        <CdxTab name="deletion" :label="`Deletion requests (${deletionRequests.length})`">
          <div class="admin-requests__filters">
            <CdxField>
              <template #label>Speedy deletion criterion</template>
              <CdxSelect
                v-model:selected="criterionFilter"
                :menu-items="CRITERION_FILTER_ITEMS"
                :menu-config="{ visibleItemLimit: 8 }"
              />
            </CdxField>
            <CdxField v-if="showSignals">
              <template #label>Page signal</template>
              <CdxSelect
                v-model:selected="deletionSignalFilter"
                :menu-items="SIGNAL_FILTER_ITEMS"
              />
            </CdxField>
          </div>
          <template v-if="useList">
            <ul v-if="filteredDeletionRequests.length" class="admin-requests__list">
              <li
                v-for="request in sortedDeletionRequests"
                :key="request.id"
                class="admin-requests__item"
              >
                <CdxCard>
                  <template #title>
                    <RouterLink :to="pageTo(request.page)">{{ request.page }}</RouterLink>
                  </template>
                  <template #description>
                    {{ formatDate(request.submitted) }}
                    <RequestSignals v-if="showSignals" :signals="request.signals" />
                  </template>
                  <template #supporting-text>
                    <dl class="admin-requests__fields">
                      <dt>Criteria</dt>
                      <dd>
                        <ul class="admin-requests__criteria">
                          <li v-for="code in request.criteria" :key="code">
                            {{ criterionLabel(code) }}
                          </li>
                        </ul>
                      </dd>
                      <template v-if="request.details">
                        <dt>Additional information</dt>
                        <dd>{{ request.details }}</dd>
                      </template>
                      <dt>Requested by</dt>
                      <dd>
                        <RequestReporters
                          :reporter="request.reporter"
                          :others="request.otherReporters"
                        />
                      </dd>
                    </dl>
                    <CdxButton
                      class="admin-requests__decline"
                      :aria-label="`Decline the request for ${request.page}`"
                      @click="decline(request)"
                    >
                      Decline
                    </CdxButton>
                  </template>
                </CdxCard>
              </li>
            </ul>
            <p v-else class="admin-requests__empty">
              {{
                criterionFilter === ALL && (!showSignals || deletionSignalFilter === ALL)
                  ? 'No deletion requests.'
                  : 'No deletion requests match these filters.'
              }}
            </p>
          </template>
          <CdxTable
            v-else
            caption="Deletion requests"
            hide-caption
            :columns="DELETION_COLUMNS"
            :data="sortedDeletionRequests"
            v-model:sort="deletionSort"
          >
            <template #item-page="{ item, row }">
              <RouterLink :to="pageTo(item)">{{ item }}</RouterLink>
              <RequestSignals v-if="showSignals" :signals="row.signals" />
            </template>
            <template #item-criteria="{ item }">
              <ul class="admin-requests__criteria">
                <li v-for="code in item" :key="code">{{ criterionLabel(code) }}</li>
              </ul>
            </template>
            <template #item-details="{ item }">
              {{ item || '—' }}
            </template>
            <template #item-reporter="{ item, row }">
              <RequestReporters :reporter="item" :others="row.otherReporters" />
            </template>
            <template #item-actions="{ row }">
              <CdxButton :aria-label="`Decline the request for ${row.page}`" @click="decline(row)">
                Decline
              </CdxButton>
            </template>
            <template #item-submitted="{ item }">
              {{ formatDate(item) }}
            </template>
            <template #empty-state>
              {{
                criterionFilter === ALL && (!showSignals || deletionSignalFilter === ALL)
                  ? 'No deletion requests.'
                  : 'No deletion requests match these filters.'
              }}
            </template>
          </CdxTable>
        </CdxTab>
      </CdxTabs>
    </SpecialPageWrapper>

    <CdxDialog
      v-model:open="confirmOpen"
      title="Decline this request?"
      use-close-button
      :primary-action="{ label: 'Decline', actionType: 'destructive' }"
      :default-action="{ label: 'Cancel' }"
      @primary="confirmDecline"
      @default="confirmOpen = false"
    >
      <p v-if="pendingDecline">
        The {{ pendingDecline.kind }} request for <strong>{{ pendingDecline.page }}</strong> will be
        removed from the queue.
        <template v-if="pendingDecline.kind === 'deletion'">
          The speedy deletion tag will be removed from the page.
        </template>
      </p>
    </CdxDialog>

    <ProtectPageDialog :request="protecting" @close="protecting = null" @protected="onProtected" />

    <CdxToast
      v-if="lastDeclined"
      :key="lastDeclined.id"
      type="success"
      auto-dismiss
      action-button-label="Undo"
      @action-button-click="undoDecline"
      @user-dismissed="lastDeclined = null"
      @auto-dismissed="lastDeclined = null"
    >
      {{ lastAction.before }} <strong>{{ lastDeclined.page }}</strong
      >{{ lastAction.after }}.
    </CdxToast>
  </ChromeWrapper>
</template>

<style scoped>
.admin-requests__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0 var(--spacing-150, 24px);
  margin-block: var(--spacing-100, 16px);
}

/* Codex spaces stacked fields; side by side they share one row. */
.admin-requests__filters > :deep(.cdx-field) {
  margin-top: 0;
}

.admin-requests__criteria {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Mobile: one card per request instead of a table. */
.admin-requests__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-requests__item {
  margin: 0;
}

.admin-requests__fields {
  margin: 0;
}

.admin-requests__fields dt {
  margin-top: var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.admin-requests__fields dt:first-child {
  margin-top: 0;
}

.admin-requests__fields dd {
  margin: 0;
}

.admin-requests__accordions {
  border-top: var(--border-width-base, 1px) solid var(--border-color-subtle);
}

.admin-requests__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
  margin-top: var(--spacing-75, 12px);
}

.admin-requests__decline {
  margin-top: var(--spacing-75, 12px);
}

.admin-requests__empty {
  color: var(--color-subtle);
}
</style>
