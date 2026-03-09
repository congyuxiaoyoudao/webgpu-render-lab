import { mat4, vec3 } from "wgpu-matrix";
import {
  D_GGX,
  Hammersley,
  ImportanceSampleGGX,
  RadicalInverseVdC,
} from "../utils/pbr/BRDF.ts";

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


export function getPrefilterMap(
  device: GPUDevice,
  cubemapTexture: GPUTexture,
  size: number,
  levels: number,
) {
  const prefilterTexture = device.createTexture({
    label: "prefilter map",
    dimension: "2d",
    size: [size, size, 6],
    format: "rgba8unorm",
    mipLevelCount: levels,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const depthTexture = device.createTexture({
    label: "prefilter map depth",
    size: [size, size],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    mipLevelCount: levels,
  });

  const vertexShader = /* wgsl */ `
struct VSOut {
  @builtin(position) Position: vec4f,
  @location(0) worldPosition: vec4f,
};

struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  roughness: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(@location(0) position: vec3f) -> VSOut {
  var output: VSOut;
  output.Position = uniforms.modelViewProjectionMatrix * vec4(position, 1.0);
  output.worldPosition = vec4(position,1.0);
  return output;
}
`;

  const fragmentShader = /* wgsl */ `
struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  roughness: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var environmentMap: texture_cube<f32>;
@group(0) @binding(2) var environmentSampler: sampler;

const PI = 3.14159265359;

${D_GGX}
${RadicalInverseVdC}
${Hammersley}
${ImportanceSampleGGX}

@fragment
fn main(@location(0) worldPosition: vec4f) -> @location(0) vec4f {
  var n = normalize(worldPosition.xyz);

  // Make the simplifying assumption that V equals R equals the normal
  let r = n;
  let v = r;

  let SAMPLE_COUNT: u32 = 4096u;
  var prefilteredColor = vec3f(0.0, 0.0, 0.0);
  var totalWeight = 0.0;

  for (var i: u32 = 0u; i < SAMPLE_COUNT; i = i + 1u) {
    // Generates a sample vector that's biased towards the preferred alignment
    // direction (importance sampling).
    let xi = Hammersley(i, SAMPLE_COUNT);
    let h = ImportanceSampleGGX(xi, n, uniforms.roughness);
    let l = normalize(2.0 * dot(v, h) * h - v);

    let nDotL = max(dot(n, l), 0.0);

    if(nDotL > 0.0) {
      // sample from the environment's mip level based on roughness/pdf
      let d = D_GGX(n, h, uniforms.roughness);
      let nDotH = max(dot(n, h), 0.0);
      let hDotV = max(dot(h, v), 0.0);
      let pdf = d * nDotH / (4.0 * hDotV) + 0.0001;

      let resolution = ${size}.0; // resolution of source cubemap (per face)
      let saTexel = 4.0 * PI / (6.0 * resolution * resolution);
      let saSample = 1.0 / (f32(SAMPLE_COUNT) * pdf + 0.0001);

      let mipLevel = select(0.5 * log2(saSample / saTexel), 0.0, uniforms.roughness == 0.0);

      prefilteredColor += textureSampleLevel(environmentMap, environmentSampler, l, mipLevel).rgb * nDotL;
      totalWeight += nDotL;
    }
  }

  prefilteredColor = prefilteredColor / totalWeight;
  // return vec4(n * 0.5 + 0.5, 1.0);
  return vec4f(prefilteredColor, 1.0);
}
`;

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
    // MVP matrix (16 floats) + roughness (1 float) + padding (3 floats)
    label: "prefilter map uniforms",
    size: Float32Array.BYTES_PER_ELEMENT * (16 + 4),
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const pipeline = device.createRenderPipeline({
    label: "prefilter map pipeline",
    layout: "auto",
    vertex: {
      module: device.createShaderModule({ code: vertexShader }),
      entryPoint: "main",
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
      module: device.createShaderModule({ code: fragmentShader }),
      entryPoint: "main",
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

  const projection = mat4.perspective(
    Math.PI / 2, // fovY
    1, // aspect
    0.1, // znear
    10 // zfar
  );

  for (let mip = 0; mip < levels; mip += 1) {
    const width = prefilterTexture.width >> mip;
    const height = prefilterTexture.height >> mip;

    const roughness = mip / (levels - 1);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer,
            offset: 0,
            size: Float32Array.BYTES_PER_ELEMENT * (16 + 4),
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

    const depthTextureView = depthTexture.createView({
      baseMipLevel: mip,
      mipLevelCount: 1,
    });

    for (let i = 0; i < 6; i += 1) {
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: prefilterTexture.createView({
              baseArrayLayer: i,
              arrayLayerCount: 1,
              baseMipLevel: mip,
              mipLevelCount: 1,
            }),
            clearValue: [0.3, 0.3, 0.3, 1],
            loadOp: "load",
            storeOp: "store",
          },
        ],
        depthStencilAttachment: {
          view: depthTextureView,
          depthClearValue: 1.0,
          depthLoadOp: "clear",
          depthStoreOp: "store",
        },
      });

      const view = mat4.invert(cubemapViewMatrices[i]);
      const modelViewProjectionMatrix = mat4.multiply(projection, view);
      const uniformData = new Float32Array([...modelViewProjectionMatrix, roughness, 0, 0, 0]);
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);

      passEncoder.setPipeline(pipeline);
      passEncoder.setViewport(0, 0, width, height, 0, 1);
      passEncoder.setVertexBuffer(0, vertexBuffer);
      passEncoder.setIndexBuffer(indexBuffer, 'uint16'); 
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.drawIndexed(36); 
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
    }
  }

  return prefilterTexture;
}
