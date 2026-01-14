// samples/useTextures/main.ts
async function initWebGPU() {
  // check if current browser supports WebGPU
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser.");
  }
  else{
    console.log("Hello, WebGPU!");
  }
  
  // request GPU adapter
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("Cannot get GPU adapter.");
  }

  // request a logical device
  const device = await adapter.requestDevice();
  
  // get canvas and configure webgpu context
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    throw new Error("Cannot get canvas.");
  }

  // fetch img texture from web
  let url = "https://www.loliapi.com/acg/pc/"
  const res = await fetch(url);
  const img = await res.blob();
  
  const bitmap = await createImageBitmap(img);
  const imgSize = [bitmap.width, bitmap.height];

  canvas.width  = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('webgpu')!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // create texture
  const texture = device.createTexture({
    size: imgSize,
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // copy image bitmap to device texture
  device.queue.copyExternalImageToTexture(
    { source: bitmap},
    { texture: texture},
    imgSize
  )

  // create sampler
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // shader code
  const shaderCode = `
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
  `;

  // create shader module
  const shaderModule = device.createShaderModule({
    code: shaderCode,
  });
  
  // create render pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
  });

  // create bind group to bind texture
  const textureBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {binding: 0, resource: sampler},
      {binding: 1, resource: texture.createView()}
    ]
  });


  // render loop
  function frame() {
    // cmdEncoder to record commands
    const commandEncoder = device.createCommandEncoder();
    
    // get current texture view
    const textureView = context.getCurrentTexture().createView();

    // begin render pass
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
    // set pipeline and vertex buffer
    passEncoder.setPipeline(pipeline);

    passEncoder.setBindGroup(0, textureBindGroup);

    // draw triangle
    passEncoder.draw(6); 
    
    // end render pass
    passEncoder.end();
    
    // finish encode and submit 
    device.queue.submit([commandEncoder.finish()]);

    // request next frame
    requestAnimationFrame(frame);
  }

  // start render loop
  requestAnimationFrame(frame);

}

initWebGPU().catch(err => {
  console.error(err);
  alert(err.message);
});