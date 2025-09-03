// samples/helloTriangle/main.ts
import {GUI} from 'lil-gui'

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
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('webgpu')!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });
  
  // data preparation
  const triangleData = new Float32Array([
    // position      color
    0.0, 0.5, 0.0,   1.0, 0.0, 0.0, 1.0,
    -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 1.0,
    0.5, -0.5, 0.0,   0.0, 0.0, 1.0, 1.0,
  ]);

  // create and write gpu buffer
  const vertexBuffer = device.createBuffer({
    size: triangleData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, triangleData);

  // shader code
  const shaderCode = `
    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
    };
    struct ColorUniform {
      colorA: vec4<f32>,
      colorB: vec4<f32>,
      colorC: vec4<f32>,
    };

    @group(0) @binding(0) var<uniform> uColors: ColorUniform;

    fn getColorByIndex(index: u32) -> vec4<f32> {
      if (index == 0u) {
        return uColors.colorA;
      } else if (index == 1u) {
        return uColors.colorB;
      } else {
        return uColors.colorC;
      }
    }

    @vertex
    fn vs_main(
      @builtin(vertex_index) vertexindex: u32,
      @location(0) pos: vec3<f32>,
      @location(1) color: vec4<f32>
    ) -> VertexOutput {
      var output: VertexOutput;
      output.position = vec4<f32>(pos, 1.0);
      output.color = getColorByIndex(vertexindex);
      return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
      return input.color;
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
      buffers: [
        {
          arrayStride: 7 * 4, // position: 3 + color: 4
          attributes: [
            { // position
              shaderLocation: 0,
              offset: 0,
              format: 'float32x3',
            },
            { // color
              shaderLocation: 1,
              offset: 3 * 4,
              format: 'float32x4',
            },
          ],
        },
      ],
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
    primitive: {
      topology: 'triangle-list',
    },
  });

  
  const gui = new GUI();

  const params = {
    colorA: [1, 0, 0, 1],
    colorB: [0, 1, 0, 1],
    colorC: [0, 0, 1, 1],
  };

  gui.addColor(params, 'colorA');
  gui.addColor(params, 'colorB');
  gui.addColor(params, 'colorC');

  const colorBuffer = device.createBuffer({
    size: 4 * 3 * 4, // 3 colors, each with 4 floats
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{
      binding: 0,
      resource: {
        buffer: colorBuffer
      }
    }],
  });


  function updateColors(){
    device.queue.writeBuffer(colorBuffer, 0, new Float32Array([...params.colorA, ...params.colorB, ...params.colorC]));
  }

  // render loop
  function frame() {
    updateColors();
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
    passEncoder.setVertexBuffer(0, vertexBuffer);

    passEncoder.setBindGroup(0, bindGroup);

    // draw triangle
    passEncoder.draw(3); 
    
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