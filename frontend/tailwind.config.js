/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo y paneles (steering: estilo-componentes)
        fondo:    "#0B1215",
        panel:    "#111A1F",
        borde:    "#1F2A30",
        // Texto
        primario: "#E5E7EB",
        secundario: "#9CA3AF",
        // Acento
        menta:    "#2DD4BF",
        // Niveles de riesgo
        rojo:     "#EF4444",
        amarillo: "#FACC15",
        verde:    "#22C55E",
        gris:     "#6B7280",
      },
    },
  },
  plugins: [],
}
