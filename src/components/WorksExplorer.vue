<script setup lang="ts">
/**
 * Explorateur d'œuvres : filtres par thème, affichage progressif et visionneuse.
 *
 * L'îlot est rendu côté serveur au build : les 59 œuvres sont donc bien présentes
 * dans le HTML (référencement) et seules les premières sont affichées — les
 * suivantes apparaissent à la demande.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { type Locale, ui, withLocale } from '../lib/i18n';

type WorkItem = {
  slug: string;
  title: string;
  theme: string;
  year: string | null;
  image: string;
  thumb: string;
  meta: string[];
};

const props = withDefaults(
  defineProps<{
    works: WorkItem[];
    themes: { value: string; label: string }[];
    /** Nombre d'œuvres affichées au chargement. */
    initialCount?: number;
    /** Nombre d'œuvres révélées à chaque clic. */
    step?: number;
    /** Langue de la page : libellés et liens vers les fiches. */
    locale?: Locale;
  }>(),
  { initialCount: 12, step: 12, locale: 'fr' }
);

/** Libellés d'interface de la langue courante. */
const t = computed(() => ui[props.locale]);
/** Chemin d'une fiche d'œuvre dans la langue courante. */
const workHref = (slug: string) => withLocale(`/oeuvres/${slug}`, props.locale);

const ALL = 'all';
const activeTheme = ref<string>(ALL);
const visibleCount = ref<number>(props.initialCount);
const openIndex = ref<number | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
let lastTrigger: HTMLElement | null = null;

const usedThemes = computed(() =>
  props.themes.filter((theme) => props.works.some((work) => work.theme === theme.value))
);

const filtered = computed(() =>
  activeTheme.value === ALL
    ? props.works
    : props.works.filter((work) => work.theme === activeTheme.value)
);

/** Œuvres réellement affichées (les autres restent dans le HTML, masquées en CSS). */
const visibleWorks = computed(() => filtered.value.slice(0, visibleCount.value));

const shownCount = computed(() => visibleWorks.value.length);
const hasMore = computed(() => visibleCount.value < filtered.value.length);
const nextBatch = computed(() => Math.min(props.step, filtered.value.length - shownCount.value));

const current = computed(() =>
  openIndex.value === null ? null : (visibleWorks.value[openIndex.value] ?? null)
);

const countFor = (value: string) =>
  value === ALL ? props.works.length : props.works.filter((work) => work.theme === value).length;

function setTheme(value: string) {
  activeTheme.value = value;
  visibleCount.value = props.initialCount;
  openIndex.value = null;
}

function showMore() {
  visibleCount.value += props.step;
}

/** Cette œuvre fait-elle partie du lot affiché ? */
function isShown(index: number) {
  return index < visibleCount.value;
}

function openViewer(work: WorkItem, event: MouseEvent) {
  lastTrigger = event.currentTarget as HTMLElement;
  openIndex.value = visibleWorks.value.findIndex((item) => item.slug === work.slug);
}

function closeViewer() {
  openIndex.value = null;
  lastTrigger?.focus();
}

function step(delta: number) {
  if (openIndex.value === null) return;
  const total = visibleWorks.value.length;
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
  <div>
    <!-- Filtres par thème -->
    <div
      class="-mx-4 mb-10 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="group"
      :aria-label="t.explorer.filtersAria"
    >
      <button
        type="button"
        class="shrink-0 rounded-full border px-4 py-2 text-[0.68rem] uppercase tracking-[0.2em] transition-colors"
        :class="
          activeTheme === ALL
            ? 'border-ink bg-ink text-canvas'
            : 'border-ink/20 text-clay hover:border-ink/50 hover:text-ink'
        "
        :aria-pressed="activeTheme === ALL"
        @click="setTheme(ALL)"
      >
        {{ t.explorer.all }} <span class="opacity-60">({{ countFor(ALL) }})</span>
      </button>
      <button
        v-for="theme in usedThemes"
        :key="theme.value"
        type="button"
        class="shrink-0 rounded-full border px-4 py-2 text-[0.68rem] uppercase tracking-[0.2em] transition-colors"
        :class="
          activeTheme === theme.value
            ? 'border-ink bg-ink text-canvas'
            : 'border-ink/20 text-clay hover:border-ink/50 hover:text-ink'
        "
        :aria-pressed="activeTheme === theme.value"
        @click="setTheme(theme.value)"
      >
        {{ theme.label }} <span class="opacity-60">({{ countFor(theme.value) }})</span>
      </button>
    </div>

    <!--
      Grille : toutes les œuvres sont présentes dans le HTML, celles qui dépassent
      le lot affiché sont masquées en CSS (`.is-deferred`).
    -->
    <TransitionGroup
      tag="div"
      name="grid"
      class="relative grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
    >
      <article
        v-for="(work, index) in filtered"
        :key="work.slug"
        class="work-card group"
        :class="{ 'is-deferred': !isShown(index) }"
        :data-theme="work.theme"
        :style="{ '--card-delay': `${Math.min(index % 12, 11) * 55}ms` }"
      >
        <figure class="work-frame relative overflow-hidden">
          <div class="aspect-square overflow-hidden bg-linen">
            <img
              :src="work.thumb"
              :alt="work.title"
              data-fade
              width="1200"
              height="1200"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
            />
          </div>
          <button
            type="button"
            class="absolute inset-0 flex items-end justify-end p-3 focus-visible:outline-offset-4 sm:opacity-0 sm:transition-opacity sm:duration-500 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            :aria-label="t.explorer.zoomAria(work.title)"
            @click="openViewer(work, $event)"
          >
            <span
              class="rounded-full bg-canvas/90 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-ink shadow-sm"
            >
              {{ t.explorer.zoom }}
            </span>
          </button>
        </figure>

        <div class="mt-4">
          <h3 class="font-display text-lg leading-snug text-ink sm:text-xl">
            <a class="link-underline" :href="workHref(work.slug)">
              {{ work.title }}<span v-if="work.year" class="text-clay">, {{ work.year }}</span>
            </a>
          </h3>
          <p v-if="work.meta.length" class="mt-1 text-xs leading-relaxed text-clay">
            {{ work.meta.join(' · ') }}
          </p>
          <button
            type="button"
            class="eyebrow mt-2 text-[0.58rem] underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
            @click="openViewer(work, $event)"
          >
            {{ t.explorer.viewLarge }}
          </button>
        </div>
      </article>
    </TransitionGroup>

    <!-- Affichage progressif (le compteur est annoncé aux lecteurs d'écran) -->
    <div v-if="filtered.length > 0" class="mt-14 flex flex-col items-center gap-5">
      <p class="text-[0.65rem] uppercase tracking-[0.24em] text-clay" aria-live="polite">
        {{ t.explorer.shown(shownCount, filtered.length) }}
      </p>
      <button
        v-if="hasMore"
        type="button"
        class="border border-ink px-7 py-3 text-[0.68rem] uppercase tracking-[0.24em] text-ink transition-colors duration-500 hover:bg-ink hover:text-canvas"
        @click="showMore"
      >
        {{ t.explorer.showMore(nextBatch) }}
      </button>
    </div>

    <p v-if="filtered.length === 0" class="py-16 text-center text-sm text-clay">
      {{ t.explorer.empty }}
    </p>

    <!--
      Visionneuse plein écran : fond blanc translucide, œuvre centrée et cartel
      posé immédiatement dessous (titre, année, technique, description).
    -->
    <Teleport to="body">
      <Transition name="viewer">
        <div
          v-if="current"
          class="fixed inset-0 z-[60] flex flex-col bg-white/95 text-ink backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          :aria-label="`${t.explorer.zoom} : ${current.title}`"
        >
          <div class="flex justify-end px-4 py-3 sm:px-8">
            <button
              ref="closeButton"
              type="button"
              class="flex items-center gap-2 rounded-full border border-ink/20 bg-white/70 px-4 py-2 text-[0.62rem] uppercase tracking-[0.2em] text-ink transition-colors hover:border-ink hover:bg-white"
              :aria-label="t.explorer.closeAria"
              @click="closeViewer()"
            >
              <svg width="12" height="12" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path
                  d="M2 2 13 13M13 2 2 13"
                  stroke="currentColor"
                  stroke-width="1.3"
                  stroke-linecap="round"
                />
              </svg>
              {{ t.explorer.close }}
            </button>
          </div>

          <div class="flex flex-1 items-center justify-center overflow-y-auto px-4 py-2 sm:px-8">
            <figure class="flex flex-col items-center gap-5">
              <img
                :src="current.image"
                :alt="current.title"
                class="max-h-[56vh] max-w-full object-contain sm:max-h-[62vh]"
              />
              <!-- Cartel : centré, immédiatement sous l'œuvre -->
              <figcaption class="max-w-2xl text-center">
                <h2 class="font-display text-xl leading-tight text-ink sm:text-2xl">
                  <span>{{ current.title }}</span><span v-if="current.year" class="text-ink/70"
                    >, {{ current.year }}</span
                  >
                </h2>
                <p
                  v-if="current.meta.length"
                  class="mt-2 text-xs leading-relaxed text-ink/70 sm:text-[0.8rem]"
                >
                  {{ current.meta.join(' · ') }}
                </p>
                <a
                  :href="workHref(current.slug)"
                  class="mt-3 inline-block text-[0.62rem] uppercase tracking-[0.24em] text-ink/70 underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
                >
                  {{ t.explorer.cardLink }}
                </a>
              </figcaption>
            </figure>
          </div>

          <div class="flex items-center justify-between gap-4 border-t border-ink/10 px-4 py-4 sm:px-8">
            <button
              type="button"
              class="rounded-full border border-ink/20 px-4 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-ink transition-colors hover:border-ink disabled:opacity-30"
              :disabled="visibleWorks.length < 2"
              :aria-label="t.explorer.previousAria"
              @click="step(-1)"
            >
              {{ t.explorer.previous }}
            </button>
            <p class="text-[0.6rem] uppercase tracking-[0.24em] text-ink/60">
              {{ (openIndex ?? 0) + 1 }} / {{ visibleWorks.length }}
            </p>
            <button
              type="button"
              class="rounded-full border border-ink/20 px-4 py-2 text-[0.6rem] uppercase tracking-[0.2em] text-ink transition-colors hover:border-ink disabled:opacity-30"
              :disabled="visibleWorks.length < 2"
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
