// samples/cubemap/main.ts
import { mat4 } from "wgpu-matrix";
import { ObjLoader } from "../utils/loaders/objLoader";
import solid_shader from './solid_shader.wgsl?raw';

async function main() {
  // request GPU adapter
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) {
    throw new Error("Cannot get GPU adapter.");
  }

  // request a logical device
  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error('need a browser that supports WebGPU');
  }

  // get canvas and configure webgpu context
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error("Cannot get canvas.");
  }

  const context = canvas.getContext('webgpu')!;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  // shader code
  const shaderCode = solid_shader;

  // create shader module
  const shaderModule = device.createShaderModule({
    code: shaderCode,
  });
  
  // create render pipeline
  const pipeline = device.createRenderPipeline({
    label: '3 buffers',
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 3 * 4,
          attributes: [{ shaderLocation:0, offset:0, format:`float32x3` },],
        },
        {
          arrayStride: 2 * 4,
          attributes: [{ shaderLocation:1, offset:0, format:`float32x2` },],
        },
        {
          arrayStride: 3 * 4,
          attributes: [{ shaderLocation:2, offset:0, format:`float32x3` },],
        }
      ]
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs',
      targets: [{ format: presentationFormat, }],
    },
    primitive: {
      cullMode: 'back',
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
  });


  const numMipLevels = (...sizes: number[]) => {
    const maxSize = Math.max(...sizes);
    return 1 + Math.log2(maxSize) | 0;
  };

  function copySourcesToTexture(device: GPUDevice, texture: GPUTexture, sources: ImageBitmap[], {flipY}: {flipY?:boolean} = {}) {
    sources.forEach((source, layer) => {
      device.queue.copyExternalImageToTexture(
        { source, flipY, },
        { texture, origin: [0, 0, layer] },
        { width: source.width, height: source.height },
      );
    });
    if (texture.mipLevelCount > 1) {
      generateMips(device, texture);
    }
  }

  function createTextureFromSources(device: GPUDevice, sources: ImageBitmap[], options: {mips?: boolean, flipY?: boolean}= {}) {
    // Assume are sources all the same size so just use the first one for width and height
    const source = sources[0];
    const texture = device.createTexture({
      format: 'rgba8unorm',
      mipLevelCount: options.mips ? numMipLevels(source.width, source.height) : 1,
      size: [source.width, source.height, sources.length],
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
    copySourcesToTexture(device, texture, sources, options);
    return texture;
  }
  
  const generateMips = (() => {
    let sampler: GPUSampler;
    let module: GPUShaderModule;
    const pipelineByFormat = {};

    return function generateMips(device: GPUDevice, texture: GPUTexture) {
      if (!module) {
        module = device.createShaderModule({
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `,
        });

        sampler = device.createSampler({
          minFilter: 'linear',
          magFilter: 'linear',
        });
      }

      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          layout: 'auto',
          vertex: {
            module,
          },
          fragment: {
            module,
            targets: [{ format: texture.format }],
          },
        });
      }
      const pipeline = pipelineByFormat[texture.format];

      const encoder = device.createCommandEncoder({
        label: 'mip gen encoder',
      });

      for (let baseMipLevel = 1; baseMipLevel < texture.mipLevelCount; ++baseMipLevel) {
        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              {
                binding: 1,
                resource: texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel - 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
              },
            ],
          });

          const renderPassDescriptor = {
            label: 'our basic canvas renderPass',
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: '2d',
                  baseMipLevel: baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1,
                }),
                loadOp: 'clear',
                storeOp: 'store',
              },
            ],
          };
          // @ts-ignore
          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);  // call our vertex shader 6 times
          pass.end();
        }
      }

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();

  async function loadImageBitmap(url: string) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
  }

  async function createTextureFromImages(device: GPUDevice, urls: string[], options: { mips?: boolean, flipY?: boolean }) {
    const images = await Promise.all(urls.map(loadImageBitmap));
    return createTextureFromSources(device, images, options);
  }

  const texture = await createTextureFromImages(
      device,
      [
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg',  
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg',  
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg',  
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg',  
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg',  
        'https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg',  
      ],
      {mips: true, flipY: false},
  );

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  // matrix: uniform buffer
  const uniformBufferSize = (16 + 16 + 16 + 3 + 1) * 4; // projection, view, world, cameraPosition, padding
  const uniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const uniformValues = new Float32Array(uniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kProjectionOffset = 0;
  const kViewOffset = 16;
  const kWorldOffset = 32;
  const kCameraPositionOffset = 48;

  const projectionValue = uniformValues.subarray(kProjectionOffset, kProjectionOffset + 16);
  const viewValue = uniformValues.subarray(kViewOffset, kViewOffset + 16);
  const worldValue = uniformValues.subarray(kWorldOffset, kWorldOffset + 16);
  const cameraPositionValue = uniformValues.subarray(kCameraPositionOffset, kCameraPositionOffset + 3);

  const objLoader = new ObjLoader();
  const objFile = await objLoader.load('/webgpu-render-lab/public/assets/obj/suzanne.obj');
  const mesh = objLoader.parse(objFile);

  const numVertices = mesh.indices.length;
  console.log(mesh.indices.slice(0, 30));
  console.log(mesh.indices.length)

  const positionBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: mesh.positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(positionBuffer, 0, mesh.positions.buffer);

  const uvBuffer = device.createBuffer({
    label: 'uv buffer',
    size: mesh.uvs.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uvBuffer, 0, mesh.uvs.buffer);

  const normalBuffer = device.createBuffer({
    label: 'normal buffer',
    size: mesh.normals.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(normalBuffer, 0, mesh.normals.buffer);

  const indexBuffer = device.createBuffer({
    label: 'index buffer',
    size: mesh.indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, mesh.indices.buffer);

  const bindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView({dimension: 'cube'}) },
    ],
  });

  const renderPassDescriptor = {
    label: 'our basic canvas renderPass',
    colorAttachments: [
      {
        // view: <- to be filled out when we render
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      // view: <- to be filled out when we render
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      depthClearValue: 1.0,
    },
  };

  let depthTexture: GPUTexture | null = null;

  // render loop
  function render(time) {
    
    time *= 0.001;
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    // @ts-ignore
    renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

    if (!depthTexture || 
        depthTexture.width !== canvas.width || 
        depthTexture.height !== canvas.height) {
      
      if (depthTexture) {
        depthTexture.destroy();
      }
      
      depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    // @ts-ignore
    renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();

    const commandEncoder = device.createCommandEncoder();
    // @ts-ignore
    const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, positionBuffer);
    pass.setVertexBuffer(1, uvBuffer);
    pass.setVertexBuffer(2, normalBuffer);
    pass.setIndexBuffer(indexBuffer, 'uint32'); //  always make sure that the format matches the buffer data

    const aspect = canvas.clientWidth / canvas.clientHeight;
    mat4.perspective(
        60 * Math.PI / 180,
        aspect,
        0.1,      // zNear
        10,      // zFar
        projectionValue,
    );
    cameraPositionValue.set([0, 0, 4]);  // camera position;
    mat4.lookAt(
      cameraPositionValue,  // camera position
      [0, 0, 0],  // target
      [0, 1, 0],  // up
      viewValue
    );
    mat4.identity(worldValue);
    mat4.rotateX(worldValue, time * -0.1, worldValue);
    mat4.rotateY(worldValue, time * -0.2, worldValue);

    device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(numVertices); 

    pass.end();
    
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
  }

  // start render loop
  requestAnimationFrame(render);
  
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
    }
  });
  observer.observe(canvas);
}

main().catch(err => {
  console.error(err);
  alert(err.message);
});