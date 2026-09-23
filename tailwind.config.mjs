/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        /*
         * Canaux RGB + `<alpha-value>` : indispensable pour que Tailwind
         * puisse générer les variantes d'opacité (bg-ink/10, text-ink/80…).
         * Les valeurs sont déclarées dans src/styles/global.css (:root).
         */
        canvas: 'rgb(var(--tw-canvas) / <alpha-value>)',
        ink: 'rgb(var(--tw-ink) / <alpha-value>)',
        clay: 'rgb(var(--tw-clay) / <alpha-value>)',
        sand: 'rgb(var(--tw-sand) / <alpha-value>)',
        linen: 'rgb(var(--tw-linen) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Jost"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.35em',
      },
      maxWidth: {
        measure: '68ch',
        gallery: '96rem',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
