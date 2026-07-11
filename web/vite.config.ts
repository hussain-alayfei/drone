import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // حزمة three كبيرة بطبيعتها لكنها lazy — تُحمَّل فقط قرب قسم 3D
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // react في حزمة صريحة كي لا يُسحب داخل حزمة three فيجعلها eager
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return "react";
          }
          // كل عائلة three في حزمة كسولة واحدة — تُحمَّل فقط قرب قسم 3D
          if (
            /node_modules[\\/](three|@react-three|react-reconciler|its-fine|suspend-react|zustand)[\\/]/.test(
              id,
            )
          ) {
            return "three";
          }
        },
      },
    },
  },
});
