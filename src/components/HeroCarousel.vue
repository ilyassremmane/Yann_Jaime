<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { type Locale, ui } from '../lib/i18n';

interface CarouselWork {
  title: string;
  alt: string;
  year?: string | null;
  image: string;
  url: string;
}

const props = defineProps<{
  works: CarouselWork[];
  heroTitle: string;
  heroSubtitle?: string;
  locale?: Locale;
}>();

const t = computed(() => ui[props.locale ?? 'fr']);

const currentIndex = ref(0);
const isPaused = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

const current = computed(() => props.works[currentIndex.value] ?? null);

function next() {
  if (props.works.length === 0) return;
  currentIndex.value = (currentIndex.value + 1) % props.works.length;
}

function prev() {
  if (props.works.length === 0) return;
  currentIndex.value = (currentIndex.value - 1 + props.works.length) % props.works.length;
}

function goTo(index: number) {
  currentIndex.value = index;
}

/* Défilement automatique, suspendu au survol et pendant un geste tactile. */
function startTimer() {
  timer = setInterval(() => {
    if (!isPaused.value) next();
  }, 5000);
}

const touchStartX = ref(0);

function handleTouchStart(event: TouchEvent) {
  touchStartX.value = event.changedTouches[0].screenX;
  isPaused.value = true;
}

function handleTouchEnd(event: TouchEvent) {
  isPaused.value = false;
  const moved = touchStartX.value - event.changedTouches[0].screenX;
  if (Math.abs(moved) > 40) (moved > 0 ? next : prev)();
}

onMounted(startTimer);
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div
    class="hero-full relative w-full overflow-hidden bg-ink select-none"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
  >
    <div
      v-for="(work, idx) in works"
      :key="work.url"
      class="absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out"
      :class="idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'"
    >
      <img
        :src="work.image"
        :alt="work.alt"
        class="h-full w-full object-cover"
        :loading="idx === 0 ? 'eager' : 'lazy'"
        :fetchpriority="idx === 0 ? 'high' : 'auto'"
      />
    </div>

    <div
      class="pointer-events-none absolute inset-x-0 top-0 z-20 h-44 bg-gradient-to-b from-ink/70 via-ink/25 to-transparent sm:h-56"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-3/5 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
      aria-hidden="true"
    ></div>

    <!-- Titre de l'artiste, légende et commandes du carrousel -->
    <div class="absolute inset-x-0 bottom-0 z-30">
      <div class="mx-auto max-w-gallery px-4 pb-12 sm:px-8 sm:pb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p class="eyebrow text-canvas/70">{{ heroSubtitle }}</p>
          <h1 class="font-display mt-2 text-4xl leading-[1.02] text-canvas sm:text-6xl lg:text-7xl">
            {{ heroTitle }}
          </h1>
          <div v-if="current" class="mt-4 flex items-center gap-2 text-sm text-canvas/90">
            <span class="font-medium text-canvas">{{ current.title }}</span>
            <span v-if="current.year" class="text-canvas/60">({{ current.year }})</span>
            <span class="text-canvas/40">—</span>
            <a
              :href="current.url"
              class="link-underline text-xs uppercase tracking-wider text-canvas/80 hover:text-white"
            >
              {{ t.home.discover }}
            </a>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-1.5">
            <button
              v-for="(_, idx) in works"
              :key="idx"
              type="button"
              @click="goTo(idx)"
              class="h-1.5 transition-all duration-300 rounded-full"
              :class="idx === currentIndex ? 'w-6 bg-canvas' : 'w-2 bg-canvas/30 hover:bg-canvas/60'"
              :aria-label="t.home.slideGoTo(idx + 1)"
            />
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="prev"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 backdrop-blur-sm transition-colors hover:border-canvas hover:text-white focus-visible:outline-offset-2"
              :aria-label="t.home.slidePrev"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              @click="next"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 backdrop-blur-sm transition-colors hover:border-canvas hover:text-white focus-visible:outline-offset-2"
              :aria-label="t.home.slideNext"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
