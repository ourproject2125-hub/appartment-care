import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

import { VitePWA } from "vite-plugin-pwa";

import tailwindcss from "tailwindcss";

import autoprefixer from "autoprefixer";


 

export default defineConfig({

  // Tailwind and PostCSS are configured here, so there are no separate config files.

  css: {

    postcss: {

      plugins: [tailwindcss({ content: ["./index.html", "./src/**/*.{js,jsx}"], theme: { extend: {} } }), autoprefixer()],

    },

  },

  plugins: [

    react(),

    // Makes the site installable on a phone's home screen and lets the app shell open offline.

    VitePWA({

      registerType: "autoUpdate",

      includeAssets: ["favicon.svg"],

      manifest: {

        name: "Apartment Care",

        short_name: "Apt Care",

        description: "Maintenance, notices, complaints and accounts for your apartment.",

        theme_color: "#2563EB",

        background_color: "#F8FAFC",

        display: "standalone",

        orientation: "portrait",

        start_url: "/",

        scope: "/",

        icons: [

          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },

          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },

        ],

      },

      // Only the app itself is cached. Data and files always come live from Supabase.

      workbox: { navigateFallback: "/index.html", globPatterns: ["**/*.{js,css,html,svg,png}"] },

    }),

  ],

});


 