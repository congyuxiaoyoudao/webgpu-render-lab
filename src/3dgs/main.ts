import { RenderEngine } from './engine';

const canvas = document.getElementById('webgpu-canvas') as HTMLCanvasElement;

if (!canvas) {
    console.error("Fatal error: Could not find a canvas element with id 'webgpu-canvas'");
} else {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    RenderEngine.init(canvas).catch(err => {
        console.error("Failed to initialize RenderEngine:", err);

        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <h2>Initialization Failed</h2>
            <p>Could not start the WebGPU engine. Please ensure your browser supports WebGPU and is up to date.</p>
            <pre>${err.message}</pre>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(errorDiv);
    });
}