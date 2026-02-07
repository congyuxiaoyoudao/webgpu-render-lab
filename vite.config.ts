import { defineConfig } from 'vite'

export default defineConfig({
  base: '/webgpu-render-lab/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        helloTriangle: 'src/helloTriangle/index.html',
        threeDGS: 'src/3dgs/index.html',
        useTextures: 'src/useTextures/index.html',
        cubemap: 'src/cubemap/index.html',
        loadModel: 'src/loadModel/index.html',
        pbr: 'src/pbr/index.html',
      }
    }
  }
})