<script setup lang="ts">
/**
 * Images secondaires d'une œuvre : grille de vignettes + visionneuse.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { type Locale, ui } from '../lib/i18n';

const props = defineProps<{
  images: { src: string; alt: string }[];
  /** Langue de la page (libellés de la visionneuse). */
  locale?: Locale;
}>();

/** Libellés d'interface de la langue courante. */
const t = computed(() => ui[props.locale ?? 'fr']);

const openIndex = ref<number | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let lastTrigger: HTMLElement | null = null;

const current = computed(() =>
  openIndex.value === null ? null : (props.images[openIndex.value] ?? null)
);

function openViewer(index: number, event: MouseEvent) {
  lastTrigger = event.currentTarget as HTMLElement;
  openIndex.value = index;
}

function closeViewer() {
  openIndex.value = null;
  lastTrigger?.focus();
}

function step(delta: number) {
  if (openIndex.value === null) return;
  const total = props.images.length;
  openIndex.value = (openIndex.value + delta + total) % total;
}

function onKeydown(event: KeyboardEvent) {
  if (openIndex.value === null) return;
  if (event.key === 'Escape') closeViewer();
  if (event.key === 'ArrowRight') step(1);
  if (event.key === 'ArrowLeft') step(-1);
}

watch(openIndex, (value) => {
  document.body.style.overflow = value === null ? '' : 'hidden';
  if (value !== null) requestAnimationFrame(() => closeButton.value?.focus());
});

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <div v-if="images.length > 0">
    <ul class="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
      <li v-for="(image, index) in images" :key="image.src">
        <button
          type="button"
          class="work-frame group block w-full overflow-hidden focus-visible:outline-offset-4"
          :aria-label="`${t.explorer.zoom} : ${image.alt}`"
          @click="openViewer(index, $event)"
        >
          <span class="block aspect-[4/3] overflow-hidden bg-linen">
            <img
              :src="image.src"
              :alt="image.alt"
              data-fade
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
            />
          </span>
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <Transition name="viewer">
        <div
          v-if="current"
          class="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          :aria-label="`${t.explorer.zoom} : ${current.alt}`"
        >
        <div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <p class="font-display truncate text-lg text-canvas">{{ current.alt }}</p>
          <button
            ref="closeButton"
            type="button"
            class="shrink-0 rounded-full border border-canvas/30 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-canvas transition-colors hover:border-canvas"
            :aria-label="t.explorer.closeAria"
            @click="closeViewer()"
          >
            {{ t.explorer.close }}
          </button>
        </div>

        <div class="flex flex-1 items-center justify-center overflow-hidden px-3 sm:px-8">
          <img :src="current.src" :alt="current.alt" class="max-h-[74vh] max-w-full object-contain" />
        </div>

        <div class="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <button
            type="button"
            class="rounded-full border border-canvas/30 px-4 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-canvas transition-colors hover:border-canvas disabled:opacity-30"
            :disabled="images.length < 2"
            :aria-label="t.explorer.previousAria"
            @click="step(-1)"
          >
            {{ t.explorer.previous }}
          </button>
          <p class="text-[0.6rem] uppercase tracking-[0.24em] text-sand/60">
            {{ (openIndex ?? 0) + 1 }} / {{ images.length }}
          </p>
          <button
            type="button"
            class="rounded-full border border-canvas/30 px-4 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-canvas transition-colors hover:border-canvas disabled:opacity-30"
            :disabled="images.length < 2"
            :aria-label="t.explorer.nextAria"
            @click="step(1)"
          >
            {{ t.explorer.next }}
          </button>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>