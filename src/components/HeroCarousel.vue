<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

interface CarouselWork {
  title: string;
  year?: string | null;
  theme: string;
  slug: string;
  image: string;
  thumb: string;
  url: string;
  themeLabel: string;
}

const props = defineProps<{
  works: CarouselWork[];
  heroTitle?: string;
  heroSubtitle?: string;
}>();

const currentIndex = ref(0);
const isPaused = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

function next() {
  if (!props.works || props.works.length === 0) return;
  currentIndex.value = (currentIndex.value + 1) % props.works.length;
}

function prev() {
  if (!props.works || props.works.length === 0) return;
  currentIndex.value = (currentIndex.value - 1 + props.works.length) % props.works.length;
}

function goTo(index: number) {
  currentIndex.value = index;
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!isPaused.value) {
      next();
    }
  }, 5000);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// Support gestes tactiles
const touchStartX = ref(0);
const touchEndX = ref(0);

function handleTouchStart(e: TouchEvent) {
  touchStartX.value = e.changedTouches[0].screenX;
  isPaused.value = true;
}

function handleTouchEnd(e: TouchEvent) {
  touchEndX.value = e.changedTouches[0].screenX;
  isPaused.value = false;
  const diff = touchStartX.value - touchEndX.value;
  if (Math.abs(diff) > 40) {
    if (diff > 0) next();
    else prev();
  }
}

onMounted(() => {
  startTimer();
});

onBeforeUnmount(() => {
  stopTimer();
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
    <!-- Slides d'images plein format -->
    <div
      v-for="(work, idx) in works"
      :key="work.slug"
      class="absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out"
      :class="idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'"
    >
      <img
        :src="work.image"
        :alt="work.title"
        class="h-full w-full object-cover"
        :loading="idx === 0 ? 'eager' : 'lazy'"
        :fetchpriority="idx === 0 ? 'high' : 'auto'"
      />
    </div>

    <!-- Voiles dégradés pour la lisibilité de l'en-tête et du texte -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 z-20 h-44 bg-gradient-to-b from-ink/70 via-ink/25 to-transparent sm:h-56"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-3/5 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
      aria-hidden="true"
    ></div>

    <!-- Titre de l'artiste + légende de l'œuvre en cours -->
    <div class="absolute inset-x-0 bottom-0 z-30">
      <div class="mx-auto max-w-gallery px-4 pb-12 sm:px-8 sm:pb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p class="eyebrow text-canvas/70">{{ heroSubtitle || 'Peinture' }}</p>
          <h1 class="font-display mt-2 text-4xl leading-[1.02] text-canvas sm:text-6xl lg:text-7xl">
            {{ heroTitle || 'Yann Jaime' }}
          </h1>
          <div v-if="works[currentIndex]" class="mt-4 flex items-center gap-2 text-sm text-canvas/90">
            <span class="font-medium text-canvas">{{ works[currentIndex].title }}</span>
            <span v-if="works[currentIndex].year" class="text-canvas/60">({{ works[currentIndex].year }})</span>
            <span class="text-canvas/40">—</span>
            <a
              :href="works[currentIndex].url"
              class="link-underline text-xs uppercase tracking-wider text-canvas/80 hover:text-white"
            >
              Découvrir la fiche →
            </a>
          </div>
        </div>

        <!-- Commandes du carrousel hero -->
        <div class="flex items-center gap-4">
          <!-- Puces / indicateurs -->
          <div class="flex items-center gap-1.5">
            <button
              v-for="(_, idx) in works"
              :key="idx"
              type="button"
              @click="goTo(idx)"
              class="h-1.5 transition-all duration-300 rounded-full"
              :class="idx === currentIndex ? 'w-6 bg-canvas' : 'w-2 bg-canvas/30 hover:bg-canvas/60'"
              :aria-label="`Aller à la photo ${idx + 1}`"
            />
          </div>

          <!-- Flèches -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="prev"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 backdrop-blur-sm transition-colors hover:border-canvas hover:text-white focus-visible:outline-offset-2"
              aria-label="Photo précédente"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              @click="next"
              class="flex h-9 w-9 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 backdrop-blur-sm transition-colors hover:border-canvas hover:text-white focus-visible:outline-offset-2"
              aria-label="Photo suivante"
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
