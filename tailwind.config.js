/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Brand palette is namespaced under `brand-*` to avoid clobbering Tailwind's
      // built-in scales (e.g. `slate-*`). Usage: bg-brand-navy, text-brand-slate.
      colors: {
        brand: {
          navy: "#0F2B3C",
          sand: "#FAF6F0",
          ocean: "#1A7FB5",
          coral: "#E26D5A",
          foam: "#6CC4A1",
          slate: "#475B6F",
          border: "#E2DDD5",
          lightblue: "#EDF5FA",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
