<script setup lang="ts">
/**
 * The first requester as a user link, then "(+n)" when others asked too.
 * The count opens a popover with the other usernames.
 */
import { ref } from 'vue'
import { CdxPopover } from '@wikimedia/codex'

defineProps<{
  reporter: string
  others?: string[]
}>()

const open = ref(false)
const anchor = ref<HTMLButtonElement | null>(null)
</script>

<template>
  <span class="request-reporters">
    <a href="#" :title="`User:${reporter}`" @click.prevent>{{ reporter }}</a>
    <template v-if="others?.length">
      {{ ' ' }}
      <button
        ref="anchor"
        type="button"
        class="request-reporters__more"
        :aria-expanded="open"
        :aria-label="`${others.length} more ${others.length === 1 ? 'user' : 'users'}`"
        @click="open = !open"
      >
        (+{{ others.length }})
      </button>
      <CdxPopover
        v-model:open="open"
        :anchor="anchor"
        placement="bottom-start"
        title="Also requested by"
        use-close-button
      >
        <ul class="request-reporters__list">
          <li v-for="name in others" :key="name">
            <a href="#" :title="`User:${name}`" @click.prevent>{{ name }}</a>
          </li>
        </ul>
      </CdxPopover>
    </template>
  </span>
</template>

<style scoped>
/* A link-styled button: it opens a popover rather than going anywhere. */
.request-reporters__more {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--color-progressive);
  cursor: pointer;
}

.request-reporters__more:hover {
  color: var(--color-progressive--hover);
  text-decoration: underline;
}

.request-reporters__more:focus-visible {
  outline: var(--border-width-thick, 2px) solid var(--outline-color-progressive--focus);
  outline-offset: 1px;
}

.request-reporters__list {
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
