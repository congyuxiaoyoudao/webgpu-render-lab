// samples/cubemap/main.ts
import { mat4 } from "wgpu-matrix";
import { GUI } from 'lil-gui'
import skybox_shader from './skybox_shader.wgsl?raw';

function createCubeVertices() {
  const vertexData = new Float32Array([
     //  position   |  normals
     //-------------+----------------------
     // front face      positive z
    -1,  1,  1,         0,  0,  1,
    -1, -1,  1,         0,  0,  1,
     1,  1,  1,         0,  0,  1,
     1, -1,  1,         0,  0,  1,
     // right face      positive x
     1,  1, -1,         1,  0,  0,
     1,  1,  1,         1,  0,  0,
     1, -1, -1,         1,  0,  0,
     1, -1,  1,         1,  0,  0,
     // back face       negative z
     1,  1, -1,         0,  0, -1,
     1, -1, -1,         0,  0, -1,
    -1,  1, -1,         0,  0, -1,
    -1, -1, -1,         0,  0, -1,
    // left face        negative x
    -1,  1,  1,        -1,  0,  0,
    -1,  1, -1,        -1,  0,  0,
    -1, -1,  1,        -1,  0,  0,
    -1, -1, -1,        -1,  0,  0,
    // bottom face      negative y
     1, -1,  1,         0, -1,  0,
    -1, -1,  1,         0, -1,  0,
     1, -1, -1,         0, -1,  0,
    -1, -1, -1,         0, -1,  0,
    // top face         positive y
    -1,  1,  1,         0,  1,  0,
     1,  1,  1,         0,  1,  0,
    -1,  1, -1,         0,  1,  0,
     1,  1, -1,         0,  1,  0,
  ]);

  const indexData = new Uint16Array([
     0,  1,  2,  2,  1,  3,  // front
     4,  5,  6,  6,  5,  7,  // right
     8,  9, 10, 10,  9, 11,  // back
    12, 13, 14, 14, 13, 15,  // left
    16, 17, 18, 18, 17, 19,  // bottom
    20, 21, 22, 22, 21, 23,  // top
  ]);

  return {
    vertexData,
    indexData,
    numVertices: indexData.length,
  };
}

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
  const envMapShaderCode = `
    struct Uniforms {
        projection: mat4x4f,
        view: mat4x4f,
        world: mat4x4f,
        cameraPosition: vec3f,
    };

    struct Vertex {
        @location(0) position: vec4f,
        @location(1) normal: vec3f,
    };

    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) worldPosition: vec3f,
      @location(1) worldNormal: vec3f,
    };

    @group(0) @binding(0) var<uniform> uni: Uniforms;
    @group(0) @binding(1) var Sampler: sampler;
    @group(0) @binding(2) var Texture: texture_cube<f32>;

    @vertex
    fn vs( vert: Vertex ) -> VertexOutput {
      var output: VertexOutput;
      output.position = uni.projection * uni.view * uni.world * vert.position;
      output.worldPosition = (uni.world * vert.position).xyz;
      output.worldNormal = (uni.world * vec4f(vert.normal, 0)).xyz;
      return output;
    }

    @fragment fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
      let worldNormal = normalize(fsInput.worldNormal);
      let eyeToSurfaceDir = normalize(fsInput.worldPosition - uni.cameraPosition);
      let direction = reflect(eyeToSurfaceDir, worldNormal);

      return textureSample(Texture, Sampler, direction);
    }
  `;

  // create shader module
  const envMapShaderModule = device.createShaderModule({
    code: envMapShaderCode,
  });
  
  // create render pipeline
  const envMapPipeline = device.createRenderPipeline({
    label: '2 attributes',
    layout: 'auto',
    vertex: {
      module: envMapShaderModule,
      entryPoint: 'vs',
      buffers: [
        {
          arrayStride: 6 * 4,
          attributes: [
            {shaderLocation:0, offset:0, format:`float32x3`},
            {shaderLocation:1, offset:12, format:`float32x3`},
          ],
        }
      ]
    },
    fragment: {
      module: envMapShaderModule,
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

  const skyboxShaderCode = skybox_shader;

  const skyboxShaderModule = device.createShaderModule({
    code: skyboxShaderCode,
  });

  const skyboxPipeline = device.createRenderPipeline({
    label: '0 attributes',
    layout: 'auto',
    vertex: {
      module: skyboxShaderModule,
      entryPoint: 'vs',
    },
    fragment: {
      module: skyboxShaderModule,
      entryPoint: 'fs',
      targets: [{ format: presentationFormat, }],
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less-equal', // set to less-equal to ensure skybox passes depth test when depth is 1.0
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
  const envMapUniformBufferSize = (16 + 16 + 16 + 3 + 1) * 4; // projection, view, world, cameraPosition, padding
  const envMapUniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: envMapUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const envMapUniformValues = new Float32Array(envMapUniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kProjectionOffset = 0;
  const kViewOffset = 16;
  const kWorldOffset = 32;
  const kCameraPositionOffset = 48;

  const projectionValue = envMapUniformValues.subarray(kProjectionOffset, kProjectionOffset + 16);
  const viewValue = envMapUniformValues.subarray(kViewOffset, kViewOffset + 16);
  const worldValue = envMapUniformValues.subarray(kWorldOffset, kWorldOffset + 16);
  const cameraPositionValue = envMapUniformValues.subarray(kCameraPositionOffset, kCameraPositionOffset + 3);

  const { vertexData, indexData, numVertices } = createCubeVertices();
  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer = device.createBuffer({
    label: 'index buffer',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

  const envMapBindGroup = device.createBindGroup({
    label: 'bind group for object',
    layout: envMapPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: envMapUniformBuffer }},
      { binding: 1, resource: sampler },
      { binding: 2, resource: texture.createView({dimension: 'cube'}) },
    ],
  });

  const skyboxUniformBufferSize = 16 * 4; // projection, view, world, cameraPosition, padding
  const skyboxUniformBuffer = device.createBuffer({
    label: 'uniforms',
    size: skyboxUniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const skyboxUniformValues = new Float32Array(skyboxUniformBufferSize / 4);

  // offsets to the various uniform values in float32 indices
  const kViewProjectionInverseOffset = 0;

  const viewProjectionInverseValue = skyboxUniformValues.subarray(
     kViewProjectionInverseOffset,
     kViewProjectionInverseOffset + 16);
  

  const skyboxBindGroup = device.createBindGroup({
    label: 'bind group for skybox',
    layout: skyboxPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: skyboxUniformBuffer }},
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
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };

  let depthTexture;

  const settings = {
    cameraRotateSpeed: 0.5,
    cubeRotateSpeed: 0.5,
  };

  const gui = new GUI();
  // gui.onChange(render);
  gui.add(settings, 'cameraRotateSpeed', 0.01, 1)
  gui.add(settings, 'cubeRotateSpeed', 0.01, 2)

  let cameraAngle = 0;
  let cubeMapAngle = 0;
  let lastTime = 0;
  // render loop
  function render(time) {
    time *= 0.001;
    const deltaTime = time - lastTime;
    lastTime = time;
    
    // Get the current texture from the canvas context and
    // set it as the texture to render to.
    const canvasTexture = context.getCurrentTexture();
    // @ts-ignore
    renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

    if (!depthTexture ||
        depthTexture.width !== canvasTexture.width ||
        depthTexture.height !== canvasTexture.height) {
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture = device.createTexture({
        size: [canvasTexture.width, canvasTexture.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    // @ts-ignore
    renderPassDescriptor.depthStencilAttachment.view = depthTexture;

    const commandEncoder = device.createCommandEncoder();
    // @ts-ignore
    const pass = commandEncoder.beginRenderPass(renderPassDescriptor);

    const aspect = canvas.clientWidth / canvas.clientHeight;
    mat4.perspective(
        60 * Math.PI / 180,
        aspect,
        0.1,      // zNear
        10,      // zFar
        projectionValue,
    );

    cameraAngle += deltaTime * settings.cameraRotateSpeed;
    cameraPositionValue.set([
      4*Math.cos(cameraAngle),
      0, 
      4*Math.sin(cameraAngle)
    ]);  // camera position;

    mat4.lookAt(
      cameraPositionValue,  // camera position
      [0, 0, 0],  // target
      [0, 1, 0],  // up
      viewValue
    );
    mat4.identity(worldValue);
    cubeMapAngle += deltaTime * settings.cubeRotateSpeed;
    mat4.rotateX(worldValue, cubeMapAngle, worldValue);
    mat4.rotateY(worldValue, cubeMapAngle*2, worldValue);

    const viewProjection = mat4.multiply(projectionValue, viewValue);
    mat4.inverse(viewProjection, viewProjectionInverseValue);

    device.queue.writeBuffer(envMapUniformBuffer, 0, envMapUniformValues);
    device.queue.writeBuffer(skyboxUniformBuffer, 0, skyboxUniformValues);

    pass.setPipeline(envMapPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setIndexBuffer(indexBuffer, 'uint16');
    pass.setBindGroup(0, envMapBindGroup);
    pass.drawIndexed(numVertices); 

    // Draw the skyBox
    pass.setPipeline(skyboxPipeline);
    pass.setBindGroup(0, skyboxBindGroup);
    pass.draw(3);

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