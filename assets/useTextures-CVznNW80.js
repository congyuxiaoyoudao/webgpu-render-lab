import"./modulepreload-polyfill-B5Qt9EMX.js";async function f(){if(navigator.gpu)console.log("Hello, WebGPU!");else throw new Error("WebGPU is not supported in this browser.");const t=await navigator.gpu.requestAdapter();if(!t)throw new Error("Cannot get GPU adapter.");const e=await t.requestDevice(),o=document.querySelector("canvas");if(!o)throw new Error("Cannot get canvas.");const g=await(await fetch("https://www.loliapi.com/acg/pc/")).blob(),r=await createImageBitmap(g),a=[r.width,r.height];o.width=r.width,o.height=r.height;const i=o.getContext("webgpu"),c=navigator.gpu.getPreferredCanvasFormat();i.configure({device:e,format:c,alphaMode:"premultiplied"});const s=e.createTexture({size:a,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});e.queue.copyExternalImageToTexture({source:r},{texture:s},a);const m=e.createSampler({magFilter:"linear",minFilter:"linear"}),u=e.createShaderModule({code:`
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) texcoord: vec2f,
    };

    @vertex
    fn vs_main(
      @builtin(vertex_index) vertexIndex: u32,
    ) -> VertexOutput {
      let pos = array(
        // 1st triangle
        vec2f( -1.0,  -1.0),  // center
        vec2f( 1.0,  -1.0),  // right, center
        vec2f( -1.0,  1.0),  // center, top

        // 2st triangle
        vec2f( -1.0,  1.0),  // center, top
        vec2f( 1.0,  -1.0),  // right, center
        vec2f( 1.0,  1.0),  // right, top
      );
      var output: VertexOutput;
      let xy = pos[vertexIndex];
      output.position = vec4f(xy, 0.0, 1.0);
      let uv = xy * 0.5 + vec2f(0.5, 0.5);
      output.texcoord = vec2f(uv.x, 1-uv.y);
      return output;
    }

    @group(0) @binding(0) var Sampler: sampler;
    @group(0) @binding(1) var Texture: texture_2d<f32>;

    @fragment fn fs_main(fsInput: VertexOutput) -> @location(0) vec4f {
      return textureSample(Texture, Sampler, fsInput.texcoord);
    }
  `}),p=e.createRenderPipeline({layout:"auto",vertex:{module:u,entryPoint:"vs_main"},fragment:{module:u,entryPoint:"fs_main",targets:[{format:c}]}}),x=e.createBindGroup({layout:p.getBindGroupLayout(0),entries:[{binding:0,resource:m},{binding:1,resource:s.createView()}]});function l(){const d=e.createCommandEncoder(),v={colorAttachments:[{view:i.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]},n=d.beginRenderPass(v);n.setPipeline(p),n.setBindGroup(0,x),n.draw(6),n.end(),e.queue.submit([d.finish()]),requestAnimationFrame(l)}requestAnimationFrame(l)}f().catch(t=>{console.error(t),alert(t.message)});
