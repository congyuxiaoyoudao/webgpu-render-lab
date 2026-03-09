import { mat4, vec3 } from "wgpu-matrix";
import irradiance_shader from './irradiance_shader.wgsl?raw';

function createCubeVertices() {
  const vertexData = new Float32Array([
     //  position
     //-----------
     // front face
    -1,  1,  1,   
    -1, -1,  1,   
     1,  1,  1,   
     1, -1,  1,   
     // right face
     1,  1, -1,   
     1,  1,  1,   
     1, -1, -1,   
     1, -1,  1,   
     // back face 
     1,  1, -1,   
     1, -1, -1,   
    -1,  1, -1,   
    -1, -1, -1,   
    // left face  
    -1,  1,  1,   
    -1,  1, -1,   
    -1, -1,  1,   
    -1, -1, -1,   
    // bottom face
     1, -1,  1,   
    -1, -1,  1,   
     1, -1, -1,   
    -1, -1, -1,   
    // top face   
    -1,  1,  1,   
     1,  1,  1,   
    -1,  1, -1,   
     1,  1, -1,   
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

export const cubemapViewMatrices = [
  // right +X
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(1.0, 0.0, 0.0),
    vec3.create(0.0, 1.0, 0.0),
  ),
  // left -X
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(-1.0, 0.0, 0.0),
    vec3.create(0.0, 1.0, 0.0),
  ),
  // top +Y
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(0.0, 1.0, 0.0),
    vec3.create(0.0, 0.0, -1.0),
  ),
  // bottom -Y
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(0.0, -1.0, 0.0),
    vec3.create(0.0, 0.0, 1.0),
  ),
  // front +Z
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(0.0, 0.0, 1.0),
    vec3.create(0.0, 1.0, 0.0),
  ),
  // back -Z
  mat4.lookAt(
    vec3.create(0.0, 0.0, 0.0),
    vec3.create(0.0, 0.0, -1.0),
    vec3.create(0.0, 1.0, 0.0),
  ),
];

export function getIrradianceMap(
  device: GPUDevice,
  cubemapTexture: GPUTexture,
  size: number,
) {
  const irradianceTexture = device.createTexture({
    label: "Irradiance map",
    dimension: "2d",
    size: [size, size, 6],
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const depthTexture = device.createTexture({
    label: "Irradiance map depth",
    size: [size, size],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const { vertexData, indexData } = createCubeVertices();
  const vertexBuffer = device.createBuffer({
    label: 'vertex buffer vertices',
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer = device.createBuffer({
    label: 'index buffer',
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indexData);

  const sampler = device.createSampler({
    label: "prefilter map",
    magFilter: "linear",
    minFilter: "linear",
  });

  const uniformBuffer = device.createBuffer({
    // MVP matrix (16 floats)
    label: "Irradiance map uniforms",
    size: Float32Array.BYTES_PER_ELEMENT * 16 ,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createRenderPipeline({
    label: "Irradiance map pipeline",
    layout: "auto",
    vertex: {
      module: device.createShaderModule({ code: irradiance_shader }),
      entryPoint: "vs",
      buffers: [
        {
          arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x3",
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({ code: irradiance_shader }),
      entryPoint: "fs",
      targets: [{ format: "rgba8unorm" }],
    },
    primitive: {
      topology: "triangle-list",
    },
    depthStencil: {
      format: "depth24plus",
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
          offset: 0,
          size: Float32Array.BYTES_PER_ELEMENT * 16,
        },
      },
      {
        binding: 1,
        resource: cubemapTexture.createView({ dimension: "cube" }),
      },
      {
        binding: 2,
        resource: sampler,
      },
    ],
  });

  const projection = mat4.perspective(
    Math.PI / 2, // fovY
    1, // aspect
    0.1, // znear
    10 // zfar
  );

  for (let i = 0; i < 6; i += 1) {
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: irradianceTexture.createView({
            baseArrayLayer: i,
            arrayLayerCount: 1,
            mipLevelCount: 1,
          }),
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: "load",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    const view = mat4.invert(cubemapViewMatrices[i]);
    const modelViewProjectionMatrix = mat4.multiply(projection, view);
    const uniformData = new Float32Array([...modelViewProjectionMatrix]);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    passEncoder.setPipeline(pipeline);
    passEncoder.setViewport(0, 0, size, size, 0, 1);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setIndexBuffer(indexBuffer, 'uint16'); 
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.drawIndexed(36); 
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  return irradianceTexture;
}
