<script setup lang="ts">
/**
 * `Special:CommunityConfiguration/<id>`: one feature's editor. "Editing <title>"
 * with its Help link, a link back to the dashboard under it, the "View form" and
 * "View history" tabs, the feature's intro, then the form (the default slot)
 * and "Save changes". Saving asks for an edit summary, then emits `save` and
 * confirms — unless the form has `errors`, which are listed above the button
 * instead. Wrap it in `ChromeWrapper`. Copy is the extension's own English
 * messages.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CdxButton, CdxDialog, CdxField, CdxIcon, CdxMessage, CdxTextArea } from '@wikimedia/codex'
import { cdxIconHelpNotice } from '@wikimedia/codex-icons'

import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { preservedQueryFromLocationQuery } from '@/appearance/url-query'

import type { CommunityConfigurationFeature } from './types'

const props = withDefaults(
  defineProps<{
    feature: CommunityConfigurationFeature
    /** The dashboard's route, which the back link leads to. */
    basePath: string
    /** Whether the reader may save. Off: the extension's "only editable by administrators" notices. */
    canEdit?: boolean
    /** The form's validation errors, e.g. "Backlog 2 → Category: Required". Any, and saving stops. */
    errors?: readonly string[]
  }>(),
  { canEdit: true, errors: () => [] },
)

const emit = defineEmits<{ save: [summary: string] }>()

const route = useRoute()

const dashboardLocation = computed(() => ({
  path: props.basePath,
  query: preservedQueryFromLocationQuery(route.query),
}))

const historyUrl = computed(() =>
  props.feature.configPage
    ? `https://en.wikipedia.org/w/index.php?${new URLSearchParams({
        title: props.feature.configPage,
        action: 'history',
      }).toString()}`
    : null,
)

const dialogOpen = ref(false)
const summary = ref('')
const saved = ref(false)
/** Save changes was tried: the form shows its errors from here on. */
const attempted = ref(false)

const showErrors = computed(() => attempted.value && props.errors.length > 0)

function openDialog(): void {
  attempted.value = true
  if (props.errors.length) return
  summary.value = ''
  dialogOpen.value = true
}

function save(): void {
  emit('save', summary.value.trim())
  dialogOpen.value = false
  saved.value = true
}
</script>

<template>
  <SpecialPageWrapper :title="`Editing ${feature.title}`" class="cc-editor">
    <template v-if="feature.helpUrl" #help>
      <a class="cc-editor__help" :href="feature.helpUrl" target="_blank">
        <CdxIcon :icon="cdxIconHelpNotice" size="small" />
        Help
      </a>
    </template>

    <!-- MediaWiki's subtitle line: a subpage's way back to its parent. -->
    <RouterLink class="cc-editor__back" :to="dashboardLocation">
      &lt; Special:CommunityConfiguration
    </RouterLink>

    <nav class="cc-editor__tabs" aria-label="Page tabs">
      <span class="cc-editor__tab cc-editor__tab--active" aria-current="page">View form</span>
      <a v-if="historyUrl" class="cc-editor__tab" :href="historyUrl" target="_blank">
        View history
      </a>
      <a v-else class="cc-editor__tab" href="#" @click.prevent>View history</a>
    </nav>

    <CdxMessage
      v-if="saved"
      type="success"
      allow-user-dismiss
      dismiss-button-label="Close"
      class="cc-editor__message"
      @user-dismissed="saved = false"
    >
      Your changes were saved
    </CdxMessage>

    <CdxMessage v-if="!canEdit" class="cc-editor__message">
      This page is protected. Configuration for this feature is only editable by administrators.
    </CdxMessage>

    <p class="cc-editor__intro">{{ feature.intro ?? feature.description }}</p>

    <form class="cc-editor__form" @submit.prevent="openDialog">
      <slot :attempted="attempted" />

      <CdxMessage v-if="showErrors" type="error">
        {{ errors.length === 1 ? 'There is an error' : `There are ${errors.length} errors` }}
        in the form:
        <ul class="cc-editor__errors">
          <li v-for="error in errors" :key="error">{{ error }}</li>
        </ul>
      </CdxMessage>

      <CdxMessage v-if="!canEdit" inline>
        You cannot save changes to this form because configuration for this feature is only editable
        by administrators.
      </CdxMessage>

      <div>
        <CdxButton type="submit" action="progressive" weight="primary" :disabled="!canEdit">
          Save changes
        </CdxButton>
      </div>
    </form>

    <CdxDialog
      v-model:open="dialogOpen"
      :title="`Save changes for ${feature.title}`"
      use-close-button
      :primary-action="{ label: 'Save changes', actionType: 'progressive' }"
      :default-action="{ label: 'Cancel' }"
      @primary="save"
      @default="dialogOpen = false"
    >
      <div class="cc-editor__dialog">
        <CdxMessage>
          <strong>Reminder</strong>: This change may impact a large number of community members,
          please consider indicating why you are making the change and linking to any related
          community discussion if appropriate.
        </CdxMessage>
        <CdxField>
          <template #label>Edit summary</template>
          <CdxTextArea
            v-model="summary"
            placeholder="Describe the changes that were made in the configuration"
          />
        </CdxField>
      </div>
    </CdxDialog>
  </SpecialPageWrapper>
</template>

<style scoped>
.cc-editor {
  padding-bottom: var(--spacing-300);
}

/* Vector: a readable column, as the extension's form. */
.cc-editor[data-skin='desktop'] {
  max-width: calc(984px + 2 * var(--spacing-150));
}

.cc-editor__back {
  display: inline-block;
  margin-bottom: var(--spacing-75);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-progressive);
  text-decoration: none;
}

.cc-editor__back:hover {
  text-decoration: underline;
}

.cc-editor__help {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  font-size: var(--font-size-small);
  color: var(--color-progressive);
  text-decoration: none;
}

.cc-editor__help .cdx-icon {
  color: inherit;
}

/* Vector 2022's page tabs: blue links, the current one base-coloured over a 2px rule. */
.cc-editor__tabs {
  display: flex;
  gap: var(--spacing-100);
  margin-bottom: var(--spacing-100);
  border-bottom: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
  font-size: var(--font-size-small);
}

.cc-editor__tab {
  margin-bottom: -1px;
  padding-block: var(--spacing-25);
  border-bottom: 2px solid transparent;
  color: var(--color-progressive);
  text-decoration: none;
}

.cc-editor__tab:hover {
  text-decoration: underline;
}

.cc-editor__tab--active,
.cc-editor__tab--active:hover {
  border-bottom-color: var(--color-base);
  color: var(--color-base);
  text-decoration: none;
}

.cc-editor__message {
  margin-bottom: var(--spacing-100);
}

.cc-editor__intro {
  margin: 0 0 var(--spacing-150);
  color: var(--color-base);
}

.cc-editor__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
}

.cc-editor__errors {
  margin: var(--spacing-25) 0 0;
  padding-inline-start: var(--spacing-150);
}

.cc-editor__dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}
</style>
