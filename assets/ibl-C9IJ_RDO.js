import"./modulepreload-polyfill-B5Qt9EMX.js";import{m as o,a as r}from"./wgpu-matrix.module-Do896bM9.js";const ie=`struct Uniforms {
  viewDirectionProjectionInverse: mat4x4f,
};
 
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) pos: vec4f,
};
 
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var ourSampler: sampler;
@group(0) @binding(2) var ourTexture: texture_cube<f32>;
 
@vertex fn vs(@builtin(vertex_index) vNdx: u32) -> VSOutput {
  let pos = array(
    vec2f(-1, 3),
    vec2f(-1,-1),
    vec2f( 3,-1),
  );
  var vsOut: VSOutput;
  vsOut.position = vec4f(pos[vNdx], 1, 1);
  vsOut.pos = vsOut.position;
  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  let t = uni.viewDirectionProjectionInverse * vsOut.pos;
  return textureSample(ourTexture, ourSampler, normalize(t.xyz / t.w) * vec3f(1, 1, -1));
}`,se=`
fn D_GGX(n: vec3f, h: vec3f, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let nDotH = max(dot(n, h), 0.0);
  let nDotH2 = nDotH * nDotH;
  var denom = (nDotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  return a2 / denom;
}
`,ue=`
// http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
// efficient VanDerCorpus calculation.
fn RadicalInverseVdC(bits: u32) -> f32 {
  var result = bits;
  result = (bits << 16u) | (bits >> 16u);
  result = ((result & 0x55555555u) << 1u) | ((result & 0xAAAAAAAAu) >> 1u);
  result = ((result & 0x33333333u) << 2u) | ((result & 0xCCCCCCCCu) >> 2u);
  result = ((result & 0x0F0F0F0Fu) << 4u) | ((result & 0xF0F0F0F0u) >> 4u);
  result = ((result & 0x00FF00FFu) << 8u) | ((result & 0xFF00FF00u) >> 8u);
  return f32(result) * 2.3283064365386963e-10;
}
`,le=`
fn Hammersley(i: u32, n: u32) -> vec2f {
  return vec2f(f32(i) / f32(n), RadicalInverseVdC(i));
}
`,ce=`
fn ImportanceSampleGGX(xi: vec2f, n: vec3f, roughness: f32) -> vec3f {
  let a = roughness * roughness;

  let phi = 2.0 * PI * xi.x;
  let cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  // from spherical coordinates to cartesian coordinates - halfway vector
  let h = vec3f(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

  // from tangent-space H vector to world-space sample vector
  let up: vec3f = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(n.z) < 0.999);
  let tangent = normalize(cross(up, n));
  let bitangent = cross(n, tangent);

  let sampleVec = tangent * h.x + bitangent * h.y + n * h.z;
  return normalize(sampleVec);
}
`;function pe(){const t=new Float32Array([-1,1,1,-1,-1,1,1,1,1,1,-1,1,1,1,-1,1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,-1,-1,-1,1,-1,-1,-1,-1,-1,1,1,-1,1,-1,-1,-1,1,-1,-1,-1,1,-1,1,-1,-1,1,1,-1,-1,-1,-1,-1,-1,1,1,1,1,1,-1,1,-1,1,1,-1]),e=new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,12,13,14,14,13,15,16,17,18,18,17,19,20,21,22,22,21,23]);return{vertexData:t,indexData:e,numVertices:e.length}}const fe=[o.lookAt(r.create(0,0,0),r.create(1,0,0),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(-1,0,0),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(0,1,0),r.create(0,0,-1)),o.lookAt(r.create(0,0,0),r.create(0,-1,0),r.create(0,0,1)),o.lookAt(r.create(0,0,0),r.create(0,0,1),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(0,0,-1),r.create(0,1,0))];function me(t,e,l,m){const f=t.createTexture({label:"prefilter map",dimension:"2d",size:[l,l,6],format:"rgba8unorm",mipLevelCount:m,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),w=t.createTexture({label:"prefilter map depth",size:[l,l],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT,mipLevelCount:m}),P=`
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
`,h=`
struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
  roughness: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var environmentMap: texture_cube<f32>;
@group(0) @binding(2) var environmentSampler: sampler;

const PI = 3.14159265359;

${se}
${ue}
${le}
${ce}

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

      let resolution = ${l}.0; // resolution of source cubemap (per face)
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
`,{vertexData:v,indexData:y}=pe(),b=t.createBuffer({label:"vertex buffer vertices",size:v.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(b,0,v);const S=t.createBuffer({label:"index buffer",size:y.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(S,0,y);const O=t.createSampler({label:"prefilter map",magFilter:"linear",minFilter:"linear"}),V=t.createBuffer({label:"prefilter map uniforms",size:Float32Array.BYTES_PER_ELEMENT*20,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),d=t.createRenderPipeline({label:"prefilter map pipeline",layout:"auto",vertex:{module:t.createShaderModule({code:P}),entryPoint:"main",buffers:[{arrayStride:Float32Array.BYTES_PER_ELEMENT*3,attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]}]},fragment:{module:t.createShaderModule({code:h}),entryPoint:"main",targets:[{format:"rgba8unorm"}]},primitive:{topology:"triangle-list"},depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}}),B=o.perspective(Math.PI/2,1,.1,10);for(let c=0;c<m;c+=1){const x=f.width>>c,T=f.height>>c,I=c/(m-1),F=t.createBindGroup({layout:d.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:V,offset:0,size:Float32Array.BYTES_PER_ELEMENT*20}},{binding:1,resource:e.createView({dimension:"cube"})},{binding:2,resource:O}]}),R=w.createView({baseMipLevel:c,mipLevelCount:1});for(let C=0;C<6;C+=1){const A=t.createCommandEncoder(),g=A.beginRenderPass({colorAttachments:[{view:f.createView({baseArrayLayer:C,arrayLayerCount:1,baseMipLevel:c,mipLevelCount:1}),clearValue:[.3,.3,.3,1],loadOp:"load",storeOp:"store"}],depthStencilAttachment:{view:R,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}}),D=o.invert(fe[C]),L=o.multiply(B,D),_=new Float32Array([...L,I,0,0,0]);t.queue.writeBuffer(V,0,_),g.setPipeline(d),g.setViewport(0,0,x,T,0,1),g.setVertexBuffer(0,b),g.setIndexBuffer(S,"uint16"),g.setBindGroup(0,F),g.drawIndexed(36),g.end(),t.queue.submit([A.finish()])}}return f}const Q=`struct Uniforms {
  modelViewProjectionMatrix: mat4x4f,
};

struct Vertex {
  @location(0) position: vec3f,
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var Texture: texture_cube<f32>;
@group(0) @binding(2) var Sampler: sampler;

const PI = 3.14159265359;

// Compute irradiance using spherical coordinate grid sampling
fn computeIrradiance(normal: vec3f) -> vec3f {
  var irradiance = vec3f(0.0, 0.0, 0.0);
  let delta = 0.025;
  var nrSample = 0.0;

  // Build tangent space from normal
  var up = vec3f(0.0, 1.0, 0.0);
  if (abs(normal.z) > 0.999) {
      up = vec3f(1.0, 0.0, 0.0);
  }
  let right = normalize(cross(up, normal));
  up = normalize(cross(normal, right));

  // Spherical coordinate sampling
  // phi: 0 -> 2*PI (around the hemisphere)
  // theta: 0 -> PI/2 (from pole to equator)
  for (var phi = 0.0; phi < 2.0 * PI; phi += delta) {
    for (var theta = 0.0; theta < 0.5 * PI; theta += delta) {
      // Convert spherical to cartesian (tangent space)
      let tangSample = vec3f(
          sin(theta) * cos(phi),
          sin(theta) * sin(phi),
          cos(theta)
      );

      // Transform to world space
      let sampleVec = tangSample.x * right + tangSample.y * up + tangSample.z * normal;

      // Sample cubemap
      let sampleColor = textureSample(Texture, Sampler, sampleVec).rgb;

      // Weight: cos(theta) * sin(theta) = sin(2*theta) / 2
      irradiance += sampleColor * cos(theta) * sin(theta);
      nrSample += 1.0;
    }
  }

  irradiance = PI * irradiance / nrSample;
  return irradiance;
}

@vertex
fn vs(vert: Vertex) -> VertexOutput {
  var output: VertexOutput;
  output.position = uni.modelViewProjectionMatrix * vec4(vert.position, 1.0);
  output.worldPosition = vec4(vert.position, 1.0);
  return output;
}

@fragment 
fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
  let n = normalize(fsInput.worldPosition).xyz;

  // Compute irradiance using spherical coordinate sampling
  let irradiance = computeIrradiance(n);

  return vec4f(irradiance, 1.0);
}
`;function de(){const t=new Float32Array([-1,1,1,-1,-1,1,1,1,1,1,-1,1,1,1,-1,1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,-1,-1,-1,1,-1,-1,-1,-1,-1,1,1,-1,1,-1,-1,-1,1,-1,-1,-1,1,-1,1,-1,-1,1,1,-1,-1,-1,-1,-1,-1,1,1,1,1,1,-1,1,-1,1,1,-1]),e=new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,12,13,14,14,13,15,16,17,18,18,17,19,20,21,22,22,21,23]);return{vertexData:t,indexData:e,numVertices:e.length}}const ge=[o.lookAt(r.create(0,0,0),r.create(1,0,0),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(-1,0,0),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(0,1,0),r.create(0,0,-1)),o.lookAt(r.create(0,0,0),r.create(0,-1,0),r.create(0,0,1)),o.lookAt(r.create(0,0,0),r.create(0,0,1),r.create(0,1,0)),o.lookAt(r.create(0,0,0),r.create(0,0,-1),r.create(0,1,0))];function he(t,e,l){const m=t.createTexture({label:"Irradiance map",dimension:"2d",size:[l,l,6],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),f=t.createTexture({label:"Irradiance map depth",size:[l,l],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),{vertexData:w,indexData:P}=de(),h=t.createBuffer({label:"vertex buffer vertices",size:w.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(h,0,w);const v=t.createBuffer({label:"index buffer",size:P.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(v,0,P);const y=t.createSampler({label:"prefilter map",magFilter:"linear",minFilter:"linear"}),b=t.createBuffer({label:"Irradiance map uniforms",size:Float32Array.BYTES_PER_ELEMENT*16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),S=t.createRenderPipeline({label:"Irradiance map pipeline",layout:"auto",vertex:{module:t.createShaderModule({code:Q}),entryPoint:"vs",buffers:[{arrayStride:Float32Array.BYTES_PER_ELEMENT*3,attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]}]},fragment:{module:t.createShaderModule({code:Q}),entryPoint:"fs",targets:[{format:"rgba8unorm"}]},primitive:{topology:"triangle-list"},depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}}),O=t.createBindGroup({layout:S.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:b,offset:0,size:Float32Array.BYTES_PER_ELEMENT*16}},{binding:1,resource:e.createView({dimension:"cube"})},{binding:2,resource:y}]}),V=o.perspective(Math.PI/2,1,.1,10);for(let d=0;d<6;d+=1){const B=t.createCommandEncoder(),c=B.beginRenderPass({colorAttachments:[{view:m.createView({baseArrayLayer:d,arrayLayerCount:1,mipLevelCount:1}),clearValue:[.3,.3,.3,1],loadOp:"load",storeOp:"store"}],depthStencilAttachment:{view:f.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}}),x=o.invert(ge[d]),T=o.multiply(V,x),I=new Float32Array([...T]);t.queue.writeBuffer(b,0,I),c.setPipeline(S),c.setViewport(0,0,l,l,0,1),c.setVertexBuffer(0,h),c.setIndexBuffer(v,"uint16"),c.setBindGroup(0,O),c.drawIndexed(36),c.end(),t.queue.submit([B.finish()])}return m}const ve=128,be=5,xe=256;function we(){const t=new Float32Array([-1,1,1,0,0,1,-1,-1,1,0,0,1,1,1,1,0,0,1,1,-1,1,0,0,1,1,1,-1,1,0,0,1,1,1,1,0,0,1,-1,-1,1,0,0,1,-1,1,1,0,0,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,-1,-1,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,1,-1,1,0,-1,0,-1,-1,1,0,-1,0,1,-1,-1,0,-1,0,-1,-1,-1,0,-1,0,-1,1,1,0,1,0,1,1,1,0,1,0,-1,1,-1,0,1,0,1,1,-1,0,1,0]),e=new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,12,13,14,14,13,15,16,17,18,18,17,19,20,21,22,22,21,23]);return{vertexData:t,indexData:e,numVertices:e.length}}async function Pe(){const t=await navigator.gpu?.requestAdapter();if(!t)throw new Error("Cannot get GPU adapter.");const e=await t.requestDevice();if(!e)throw new Error("need a browser that supports WebGPU");const l=document.querySelector("canvas");if(!l)throw new Error("Cannot get canvas.");const m=l.getContext("webgpu"),f=navigator.gpu.getPreferredCanvasFormat();m.configure({device:e,format:f,alphaMode:"premultiplied"});const w=`
    struct Uniforms {
        projection: mat4x4f,
        view: mat4x4f,
        world: mat4x4f,
        cameraPosition: vec3f,
        roughness: f32,
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
    @group(0) @binding(2) var cubemapTexture: texture_cube<f32>;
    @group(0) @binding(3) var irradianceTexture: texture_cube<f32>;
    @group(0) @binding(4) var prefilterTexture: texture_cube<f32>;

    @vertex
    fn vs( vert: Vertex ) -> VertexOutput {
      var output: VertexOutput;
      output.position = uni.projection * uni.view * uni.world * vert.position;
      output.worldPosition = (uni.world * vert.position).xyz;
      output.worldNormal = (uni.world * vec4f(vert.normal, 0)).xyz;
      return output;
    }

    @fragment
    fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
      let n = normalize(fsInput.worldNormal);
      let v = normalize(uni.cameraPosition - fsInput.worldPosition);
      let r = reflect(-v, n);
      let irradianceColor = textureSample(irradianceTexture, Sampler, r).rgb;
      let prefilterColor = textureSampleLevel(prefilterTexture, Sampler, r, uni.roughness * 4).rgb;
      let envMapColor = textureSample(cubemapTexture, Sampler, r).rgb;
      return vec4(prefilterColor, 1.0);
    }
  `,P=`
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
    @group(0) @binding(2) var irradianceTexture: texture_cube<f32>;

    @vertex
    fn vs( vert: Vertex ) -> VertexOutput {
      var output: VertexOutput;
      output.position = uni.projection * uni.view * uni.world * vert.position;
      output.worldPosition = (uni.world * vert.position).xyz;
      output.worldNormal = (uni.world * vec4f(vert.normal, 0)).xyz;
      return output;
    }

    @fragment
    fn fs(fsInput: VertexOutput) -> @location(0) vec4f {
      let n = normalize(fsInput.worldNormal);
      let irradiance = textureSample(irradianceTexture, Sampler, n).rgb;
      return vec4(irradiance, 1.0);
    }
  `,h=e.createRenderPipeline({label:"2 attributes",layout:"auto",vertex:{module:e.createShaderModule({code:w}),entryPoint:"vs",buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]}]},fragment:{module:e.createShaderModule({code:w}),entryPoint:"fs",targets:[{format:f}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),v=e.createRenderPipeline({label:"irradiance",layout:"auto",vertex:{module:e.createShaderModule({code:P}),entryPoint:"vs",buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]}]},fragment:{module:e.createShaderModule({code:P}),entryPoint:"fs",targets:[{format:f}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),y=ie,b=e.createRenderPipeline({label:"0 attributes",layout:"auto",vertex:{module:e.createShaderModule({code:y}),entryPoint:"vs"},fragment:{module:e.createShaderModule({code:y}),entryPoint:"fs",targets:[{format:f}]},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal",format:"depth24plus"}}),S=(...i)=>{const a=Math.max(...i);return 1+Math.log2(a)|0};function O(i,a,n,{flipY:p}={}){n.forEach((s,u)=>{i.queue.copyExternalImageToTexture({source:s,flipY:p},{texture:a,origin:[0,0,u]},{width:s.width,height:s.height})}),a.mipLevelCount>1&&d(i,a)}function V(i,a,n={}){const p=a[0],s=i.createTexture({format:"rgba8unorm",mipLevelCount:n.mips?S(p.width,p.height):1,size:[p.width,p.height,a.length],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return O(i,s,a,n),s}const d=(()=>{let i,a;const n={};return function(s,u){a||(a=s.createShaderModule({code:`
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
          `}),i=s.createSampler({minFilter:"linear",magFilter:"linear"})),n[u.format]||(n[u.format]=s.createRenderPipeline({layout:"auto",vertex:{module:a},fragment:{module:a,targets:[{format:u.format}]}}));const G=n[u.format],N=s.createCommandEncoder({label:"mip gen encoder"});for(let M=1;M<u.mipLevelCount;++M)for(let z=0;z<u.depthOrArrayLayers;++z){const ae=s.createBindGroup({layout:G.getBindGroupLayout(0),entries:[{binding:0,resource:i},{binding:1,resource:u.createView({dimension:"2d",baseMipLevel:M-1,mipLevelCount:1,baseArrayLayer:z,arrayLayerCount:1})}]}),oe={label:"our basic canvas renderPass",colorAttachments:[{view:u.createView({dimension:"2d",baseMipLevel:M,mipLevelCount:1,baseArrayLayer:z,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},k=N.beginRenderPass(oe);k.setPipeline(G),k.setBindGroup(0,ae),k.draw(6),k.end()}const E=N.finish();s.queue.submit([E])}})();async function B(i){const n=await(await fetch(i)).blob();return await createImageBitmap(n,{colorSpaceConversion:"none"})}async function c(i,a,n){const p=await Promise.all(a.map(B));return V(i,p,n)}const x=await c(e,["https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg"],{mips:!0,flipY:!1}),T=e.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),I=await me(e,x,ve,be),F=await he(e,x,xe),R=[-3,-1,1,3],C=[0,.1,.4,.6],A=208,g=R.map((i,a)=>{const n=e.createBuffer({label:"uniforms",size:A,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),p=new Float32Array(A/4);let s;return a===0?s=e.createBindGroup({label:"bind group for irradiance",layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:T},{binding:2,resource:F.createView({dimension:"cube"})}]}):s=e.createBindGroup({label:"bind group for prefilter",layout:h.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:T},{binding:2,resource:x.createView({dimension:"cube"})},{binding:3,resource:F.createView({dimension:"cube"})},{binding:4,resource:I.createView({dimension:"cube"})}]}),{buffer:n,values:p,bindGroup:s}}),D=new Float32Array(A/4),L=D.subarray(0,16),_=D.subarray(16,32),q=D.subarray(48,51),{vertexData:j,indexData:ee,numVertices:te}=we(),Y=e.createBuffer({label:"vertex buffer vertices",size:j.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(Y,0,j);const X=e.createBuffer({label:"index buffer",size:j.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(X,0,ee);const W=64,$=e.createBuffer({label:"uniforms",size:W,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),Z=new Float32Array(W/4),J=0,re=Z.subarray(J,J+16),ne=e.createBindGroup({label:"bind group for skybox",layout:b.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:$}},{binding:1,resource:T},{binding:2,resource:x.createView({dimension:"cube"})}]}),H={label:"our basic canvas renderPass",colorAttachments:[{loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}};let U;function K(){const i=m.getCurrentTexture();H.colorAttachments[0].view=i.createView(),(!U||U.width!==i.width||U.height!==i.height)&&(U&&U.destroy(),U=e.createTexture({size:[i.width,i.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT})),H.depthStencilAttachment.view=U;const a=e.createCommandEncoder(),n=a.beginRenderPass(H),p=l.clientWidth/l.clientHeight;o.perspective(60*Math.PI/180,p,.1,100,L),q.set([0,2,8]),o.lookAt(q,[0,0,0],[0,1,0],_);const s=o.multiply(L,_);o.inverse(s,re),n.setPipeline(h),n.setVertexBuffer(0,Y),n.setIndexBuffer(X,"uint16"),g.forEach((u,G)=>{const N=R[G],E=u.values.subarray(32,48),M=u.values.subarray(51,52);u.values.set(L,0),u.values.set(_,16),u.values.set(q,48),o.identity(E),o.translate(E,[N,0,0],E),o.scale(E,[.5,.5,.5],E),G==0?n.setPipeline(v):(n.setPipeline(h),M[0]=C[G]),e.queue.writeBuffer(u.buffer,0,u.values),n.setBindGroup(0,u.bindGroup),n.drawIndexed(te)}),e.queue.writeBuffer($,0,Z),n.setPipeline(b),n.setBindGroup(0,ne),n.draw(3),n.end(),e.queue.submit([a.finish()]),requestAnimationFrame(K)}requestAnimationFrame(K),new ResizeObserver(i=>{for(const a of i){const n=a.target,p=a.contentBoxSize[0].inlineSize,s=a.contentBoxSize[0].blockSize;n.width=Math.max(1,Math.min(p,e.limits.maxTextureDimension2D)),n.height=Math.max(1,Math.min(s,e.limits.maxTextureDimension2D))}}).observe(l)}Pe().catch(t=>{console.error(t),alert(t.message)});
