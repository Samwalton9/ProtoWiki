<script setup lang="ts">
/**
 * MediaWiki's protection form (`action=protect`) as a dialog: edit and move
 * levels, expiry, reason and watch. Choices start from what the editor
 * requested. Confirm protects nothing; it emits `protected` with a summary.
 */
import { computed, ref, watch } from 'vue'
import {
  CdxCheckbox,
  CdxDialog,
  CdxField,
  CdxMessage,
  CdxSelect,
  CdxTextInput,
} from '@wikimedia/codex'

import type { ProtectionRequest } from '../adminRequests'

const props = defineProps<{
  /** The request being acted on; `null` closes the dialog. */
  request: ProtectionRequest | null
}>()

const emit = defineEmits<{
  close: []
  protected: [summary: string]
}>()

type Level = 'all' | 'autoconfirmed' | 'extendedconfirmed' | 'sysop'

/* English Wikipedia's levels, expiries and reasons. */
const LEVELS: { value: Level; label: string }[] = [
  { value: 'all', label: 'Allow all users' },
  { value: 'autoconfirmed', label: 'Allow only autoconfirmed users' },
  { value: 'extendedconfirmed', label: 'Allow only extended confirmed users' },
  { value: 'sysop', label: 'Allow only administrators' },
]

const LEVEL_NAMES: Record<Level, string> = {
  all: 'unprotected',
  autoconfirmed: 'semi-protected',
  extendedconfirmed: 'extended confirmed protected',
  sysop: 'fully protected',
}

const EXPIRIES = [
  '1 hour',
  '1 day',
  '1 week',
  '2 weeks',
  '1 month',
  '3 months',
  '6 months',
  '1 year',
  'indefinite',
].map((value) => ({ value, label: value }))

const OTHER_REASON = 'other'
const REASONS = [
  { value: OTHER_REASON, label: 'Other reason' },
  ...[
    'Persistent vandalism',
    'Persistent disruptive editing',
    'Persistent sock puppetry',
    'Edit warring / content dispute',
    'Violations of the biographies of living persons policy',
    'Persistent spamming',
    'Page-move vandalism',
    'High-risk page',
  ].map((value) => ({ value, label: value })),
]

const editLevel = ref<Level>('all')
const moveLevel = ref<Level>('all')
const unlockMove = ref(false)
const expiry = ref('1 week')
const reason = ref(OTHER_REASON)
const otherReason = ref('')
const watchPage = ref(true)

const open = computed({
  get: () => props.request !== null,
  set: (value: boolean) => {
    if (!value) emit('close')
  },
})

/** Start from the requested protection. */
watch(
  () => props.request,
  (request) => {
    if (!request) return
    const requested: Record<string, [Level, Level]> = {
      semi: ['autoconfirmed', 'autoconfirmed'],
      extended: ['extendedconfirmed', 'extendedconfirmed'],
      full: ['sysop', 'sysop'],
      move: ['all', 'sysop'],
    }
    const [edit, move] = requested[request.protectionType] ?? ['all', 'all']
    editLevel.value = edit
    moveLevel.value = move
    unlockMove.value = edit !== move
    expiry.value = request.protectionType === 'move' ? 'indefinite' : '1 week'
    reason.value = OTHER_REASON
    otherReason.value = request.reason
    watchPage.value = true
  },
  { immediate: true },
)

/** Locked: move protection follows edit protection, as on the wiki. */
const effectiveMoveLevel = computed(() => (unlockMove.value ? moveLevel.value : editLevel.value))

watch(unlockMove, (unlocked) => {
  if (!unlocked) moveLevel.value = editLevel.value
})

const nothingToProtect = computed(
  () => editLevel.value === 'all' && effectiveMoveLevel.value === 'all',
)

const title = computed(() =>
  props.request ? `Change protection level of "${props.request.page}"` : 'Change protection level',
)

function confirm(): void {
  if (nothingToProtect.value) return
  const parts: string[] = []
  if (editLevel.value !== 'all') parts.push(`edit ${LEVEL_NAMES[editLevel.value]}`)
  if (effectiveMoveLevel.value !== 'all')
    parts.push(`move ${LEVEL_NAMES[effectiveMoveLevel.value]}`)
  emit('protected', `${parts.join(', ')} (${expiry.value})`)
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    :title="title"
    use-close-button
    :primary-action="{ label: 'Confirm', actionType: 'progressive', disabled: nothingToProtect }"
    :default-action="{ label: 'Cancel' }"
    @primary="confirm"
    @default="open = false"
  >
    <CdxMessage v-if="request?.protectionType === 'pending'" inline>
      The editor asked for pending changes protection, which is set on a separate form. Choose edit
      protection here instead, or decline the request.
    </CdxMessage>

    <CdxField>
      <template #label>Edit</template>
      <CdxSelect v-model:selected="editLevel" :menu-items="LEVELS" />
    </CdxField>

    <CdxCheckbox v-model="unlockMove" class="protect-dialog__unlock">
      Unlock further protect options
    </CdxCheckbox>

    <CdxField :disabled="!unlockMove">
      <template #label>Move</template>
      <CdxSelect v-model:selected="moveLevel" :menu-items="LEVELS" />
    </CdxField>

    <CdxField>
      <template #label>Expires</template>
      <CdxSelect v-model:selected="expiry" :menu-items="EXPIRIES" />
    </CdxField>

    <CdxField>
      <template #label>Reason</template>
      <CdxSelect v-model:selected="reason" :menu-items="REASONS" />
    </CdxField>

    <CdxField :optional="reason !== OTHER_REASON">
      <template #label>
        {{ reason === OTHER_REASON ? 'Other reason' : 'Other/additional reason' }}
      </template>
      <CdxTextInput v-model="otherReason" />
    </CdxField>

    <CdxCheckbox v-model="watchPage" class="protect-dialog__watch">Watch this page</CdxCheckbox>
  </CdxDialog>
</template>

<style scoped>
.protect-dialog__unlock,
.protect-dialog__watch {
  margin-top: var(--spacing-100, 16px);
}
</style>
