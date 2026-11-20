<script setup lang="ts">
/**
 * "Report this page" dialog: the editor asks for protection (a reason and a
 * kind of protection) or for speedy deletion (one or more criteria, required).
 * Submit closes the dialog and emits `submitted` with the report.
 */
import { computed, ref, watch } from 'vue'
import {
  CdxDialog,
  CdxField,
  CdxMultiselectLookup,
  CdxRadio,
  CdxTextArea,
  type ChipInputItem,
} from '@wikimedia/codex'

import type { ReportDraft } from './adminRequests'
import { filterCriteria, PROTECTION_TYPES, type ProtectionType } from './reportOptions'

const props = defineProps<{
  /** Page being reported, shown in the dialog subtitle. */
  pageTitle: string
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  submitted: [report: ReportDraft]
}>()

const kind = ref<'protection' | 'deletion' | null>(null)
const protectionType = ref<ProtectionType | null>(null)
const protectionReason = ref('')
const criteria = ref<string[]>([])
const criteriaChips = ref<ChipInputItem[]>([])
const criteriaQuery = ref('')
const criteriaMenu = computed(() => filterCriteria(criteriaQuery.value))
const deletionDetails = ref('')
/** Show field errors only after the first submit attempt. */
const triedSubmit = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  kind.value = null
  protectionType.value = null
  protectionReason.value = ''
  criteria.value = []
  criteriaChips.value = []
  criteriaQuery.value = ''
  deletionDetails.value = ''
  triedSubmit.value = false
})

const errors = computed(() => ({
  kind: !kind.value,
  protectionType: kind.value === 'protection' && !protectionType.value,
  protectionReason: kind.value === 'protection' && !protectionReason.value.trim(),
  criteria: kind.value === 'deletion' && !criteria.value.length,
}))

const isValid = computed(() => !Object.values(errors.value).some(Boolean))

function status(field: keyof typeof errors.value): 'error' | 'default' {
  return triedSubmit.value && errors.value[field] ? 'error' : 'default'
}

function submit(): void {
  triedSubmit.value = true
  if (!isValid.value) return
  if (kind.value === 'protection' && protectionType.value) {
    emit('submitted', {
      kind: 'protection',
      protectionType: protectionType.value,
      reason: protectionReason.value.trim(),
    })
  } else if (kind.value === 'deletion' && criteria.value.length) {
    emit('submitted', {
      kind: 'deletion',
      criteria: [...criteria.value],
      details: deletionDetails.value.trim(),
    })
  }
  open.value = false
}
</script>

<template>
  <CdxDialog
    v-model:open="open"
    title="Report this page"
    :subtitle="props.pageTitle"
    use-close-button
    :primary-action="{ label: 'Submit report', actionType: 'progressive' }"
    :default-action="{ label: 'Cancel' }"
    @primary="submit"
    @default="open = false"
  >
    <CdxField
      is-fieldset
      :status="status('kind')"
      :messages="{ error: 'Choose what you want to request.' }"
    >
      <template #label>What do you want to request?</template>
      <CdxRadio v-model="kind" name="report-kind" input-value="protection">
        Protection
        <template #description>Limit who can edit this page.</template>
      </CdxRadio>
      <CdxRadio v-model="kind" name="report-kind" input-value="deletion">
        Deletion
        <template #description>Ask an administrator to delete this page quickly.</template>
      </CdxRadio>
    </CdxField>

    <template v-if="kind === 'protection'">
      <CdxField
        is-fieldset
        :status="status('protectionType')"
        :messages="{ error: 'Choose a kind of protection.' }"
      >
        <template #label>Kind of protection</template>
        <CdxRadio
          v-for="type in PROTECTION_TYPES"
          :key="type.value"
          v-model="protectionType"
          name="report-protection-type"
          :input-value="type.value"
        >
          {{ type.label }}
          <template #description>{{ type.description }}</template>
        </CdxRadio>
      </CdxField>

      <CdxField
        :status="status('protectionReason')"
        :messages="{ error: 'Give a reason for protection.' }"
      >
        <template #label>Reason</template>
        <template #description>
          For example, repeated vandalism or an edit war. Link to diffs if you can.
        </template>
        <CdxTextArea v-model="protectionReason" autosize />
      </CdxField>
    </template>

    <template v-else-if="kind === 'deletion'">
      <CdxField
        :status="status('criteria')"
        :messages="{ error: 'Choose at least one speedy deletion criterion.' }"
      >
        <template #label>Speedy deletion criteria</template>
        <template #description>
          Choose every criterion that applies. Pages that do not meet a criterion need a deletion
          discussion instead.
        </template>
        <CdxMultiselectLookup
          v-model:input-chips="criteriaChips"
          v-model:selected="criteria"
          v-model:input-value="criteriaQuery"
          :menu-items="criteriaMenu"
          :menu-config="{ visibleItemLimit: 6 }"
          placeholder="Search by code or reason, e.g. G11 or advertising"
          separate-input
        >
          <template #no-results>No matching criteria.</template>
        </CdxMultiselectLookup>
      </CdxField>

      <CdxField optional>
        <template #label>Additional information</template>
        <template #description>
          For example, the deletion discussion (G4) or the source being copied (G12).
        </template>
        <CdxTextArea v-model="deletionDetails" autosize />
      </CdxField>
    </template>
  </CdxDialog>
</template>
