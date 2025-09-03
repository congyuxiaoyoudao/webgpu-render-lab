import { defineConfig } from 'vite'

export default defineConfig({
  base: '/webgpu-render-lab/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        helloTriangle: 'src/helloTriangle/index.html',
        threeDGS: 'src/3dgs/index.html',
      }
    }
  }
})