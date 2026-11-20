import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        watch: {
            // Visual Studio locks files in its hidden .vs folder, so Vite skips it
            ignored: ['**/.vs/**'],
        },
    },
})