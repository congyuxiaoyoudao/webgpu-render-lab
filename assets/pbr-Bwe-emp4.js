import"./modulepreload-polyfill-B5Qt9EMX.js";import{m as c}from"./wgpu-matrix.module-Do896bM9.js";import{O as re}from"./objLoader-CDcZvcos.js";const oe=`struct Uniforms {
    projection: mat4x4f,
    view: mat4x4f,
    model: mat4x4f,
    normalMatrix: mat3x3f,
    cameraPosition: vec3f,
};

struct Vertex {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec4f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) positionWS: vec3f,
    @location(1) normalWS: vec3f,
    @location(2) texcoord: vec2f,
    @location(3) tangentWS: vec4f,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

@group(1) @binding(0) var Sampler: sampler;
@group(1) @binding(1) var BaseColorTexture: texture_2d<f32>;;
@group(1) @binding(2) var NormalTexture: texture_2d<f32>;
@group(1) @binding(3) var MetallicRoughnessTexture: texture_2d<f32>;
@group(1) @binding(4) var EmissiveTexture: texture_2d<f32>;
@group(1) @binding(5) var OcclusionTexture: texture_2d<f32>;


struct VertexNormalInputs {
    normalWS: vec3f,
    tangentWS: vec3f,
    bitangentWS: vec3f,
};


struct BRDFContext {
    NoL: f32,
    NoV: f32,
    NoH: f32,
    VoH: f32,
    NoL01: f32,
    NoV01: f32,
    NoH01: f32,
    VoH01: f32,
}


fn InitBRDFContext(N: vec3f, V: vec3f, L: vec3f) -> BRDFContext {
    var ctx: BRDFContext;

    let H = normalize(V + L);

    ctx.NoL = dot(N, L);
    ctx.NoV = dot(N, V);
    ctx.NoH = dot(N, H);
    ctx.VoH = dot(V, H);

    ctx.NoL01 = clamp(ctx.NoL, 0.0, 1.0);
    ctx.NoV01 = clamp(ctx.NoV, 0.0, 1.0);
    ctx.NoH01 = clamp(ctx.NoH, 0.0, 1.0);
    ctx.VoH01 = clamp(ctx.VoH, 0.0, 1.0);

    return ctx;
}


fn GetVertexNormalInputs(normalOS: vec3f, tangentOS: vec4f) -> VertexNormalInputs {
    var tbn: VertexNormalInputs;

    // mikkts space compliant. only normalize when extracting normal at frag.
    let sign = tangentOS.w;
    tbn.normalWS = normalize(uni.normalMatrix * normalOS);
    tbn.tangentWS = normalize(uni.model * vec4f(tangentOS.xyz, 0.0)).xyz;
    tbn.bitangentWS = normalize(cross(tbn.normalWS, tbn.tangentWS) * sign);
    return tbn;
}


@vertex
fn vs( vert: Vertex ) -> VertexOutput {
    var out: VertexOutput;
    let position = vec4f(vert.position, 1.0);
    out.position = uni.projection * uni.view * uni.model * position;
    out.positionWS = (uni.model * position).xyz;
    
    var vertexNormalInputs = GetVertexNormalInputs(vert.normal, vert.tangent);
    out.normalWS = vertexNormalInputs.normalWS;
    // out.normalWS = normalize(uni.normalMatrix * vert.normal);
    out.tangentWS = vec4f(vertexNormalInputs.tangentWS, vert.tangent.w);

    out.texcoord = vert.uv;
    return out;
}


fn srgbToLinear(c: vec3f) -> vec3f {
    return pow(c, vec3f(2.2));
}


fn linearToSrgb(c: vec3f) -> vec3f {
    return pow(c, vec3f(0.454));
}


fn computeF0(baseColor: vec3f, metallic: f32, dielectricF0: vec3f ) -> vec3f {
    return mix(dielectricF0, baseColor, metallic);
}


fn computeDiffuseColor(baseColor: vec3f, metallic: f32) -> vec3f {
    return baseColor * (1.0 - metallic);
}


fn perceptualRoughnessToRoughness(perceptualRoughness: f32) -> f32 {
    return perceptualRoughness * perceptualRoughness;
}


fn roughnessToPerceptualRoughness(roughness: f32) -> f32 {
    return sqrt(roughness);
}

// f0 + (1 - f0) * pow((1 - cosTheta), 5)
fn F_Schlick(f0: vec3f, f90: vec3f, thetaD: f32) -> vec3f {
    let u = 1.0 - thetaD;
    let u2 = u * u;
    let u5 = u2 * u2 * u;
    return f0 + f90 * u5;
}

fn D_GGX_NoPI(thetaD: f32, roughness: f32) -> f32 {
    let a2 = roughness * roughness;
    let thetaD2 = thetaD * thetaD;
    let b = thetaD2 * (a2 - 1) + 1;
    return a2 * (1.0 / (b * b));
}

const INV_PI: f32 = 0.31830988618;
fn D_GGX(thetaD: f32, roughness: f32) -> f32 {
    return D_GGX_NoPI(thetaD, roughness) * INV_PI;
}


fn G_JointSmithPartial(theta: f32, roughness: f32) -> f32 {
    let k = roughness / 2;
    return theta / (theta * (1 - k) + k);
}


fn G_JointSmith(thetaL: f32, thetaV: f32, roughness: f32) -> f32 {
    return G_JointSmithPartial(thetaL, roughness) * G_JointSmithPartial(thetaV, roughness);
} 


fn evalGIColor() -> vec3f {
    return vec3f(1.0);
}


@fragment 
fn fs(in: VertexOutput) -> @location(0) vec4f {

    // sample textures
    let baseSample = textureSample(BaseColorTexture, Sampler, in.texcoord);
    let alpha = baseSample.a;
    let baseColor = srgbToLinear(baseSample.rgb);
    // let baseColor = baseSample.rgb;
    
    let normalSample = textureSample(NormalTexture, Sampler, in.texcoord);
    let normalTS = normalSample.xyz * 2 - 1;
    let T = normalize(in.tangentWS.xyz);
    let B = normalize(cross(in.normalWS, in.tangentWS.xyz) * in.tangentWS.w);
    let N = normalize(in.normalWS);
    let tangentMatrix = mat3x3f(T, B, N);
    let normalDirWS = normalize(tangentMatrix * normalTS);

    let mrColor = textureSample(MetallicRoughnessTexture, Sampler, in.texcoord);
    let emissiveSample = textureSample(EmissiveTexture, Sampler, in.texcoord);
    let emissiveFactor = 5.0;
    let emissiveColor = srgbToLinear(emissiveSample.rgb) * emissiveFactor;
    let occlusionColor = textureSample(OcclusionTexture, Sampler, in.texcoord);

    let metallic = mrColor.b;
    let perceptualRoughness = mrColor.g;
    let roughness = perceptualRoughnessToRoughness(perceptualRoughness);

    let dielectricF0 = vec3f(0.08, 0.08, 0.08);
    let F0 = computeF0(baseColor, metallic, dielectricF0);
    let diffuseColor = computeDiffuseColor(baseColor, metallic);
    
    let viewDirWS = normalize(uni.cameraPosition - in.positionWS);
    let lightDirWS = normalize(vec3f(0.4, 0.2, 0.1));
    let halfDirWS = normalize(lightDirWS + viewDirWS);
    // let R = reflect(-viewDirWS, normalDirWS);

    let NoL = dot(normalDirWS, lightDirWS);
    let NoV = dot(normalDirWS, viewDirWS);
    let NoH = dot(normalDirWS, halfDirWS);
    let VoH = dot(viewDirWS, halfDirWS);
    let NoL01 = clamp(NoL, 0.0, 1.0);
    let NoV01 = clamp(NoV, 0.0, 1.0);
    let NoH01 = clamp(NoH, 0.0, 1.0);
    let VoH01 = clamp(VoH, 0.0, 1.0);

    let SpecularF = F_Schlick(F0, vec3f(1.0, 1.0, 1.0), VoH01); 
    let SpecularD = D_GGX(NoH01, roughness);
    let SpecularG = G_JointSmith(NoL01, NoV01, roughness);
    let specularColor = SpecularF * SpecularD * SpecularG / (4.0 * max(NoL01, 0.001) * max(NoV01, 0.001));
    let finalColor = diffuseColor + specularColor + emissiveColor;
    // return vec4f(metallic);
    return vec4f(linearToSrgb(finalColor), 1.0);
}`;async function ae(){const p=await navigator.gpu?.requestAdapter();if(!p)throw new Error("Cannot get GPU adapter.");const e=await p.requestDevice();if(!e)throw new Error("need a browser that supports WebGPU");const a=document.querySelector("canvas");if(!a)throw new Error("Cannot get canvas.");const w=a.getContext("webgpu"),T=window.devicePixelRatio;a.width=a.clientWidth*T,a.height=a.clientHeight*T;const B=navigator.gpu.getPreferredCanvasFormat();w.configure({device:e,format:B,alphaMode:"premultiplied"});const z=oe,V=e.createShaderModule({code:z}),v=e.createRenderPipeline({label:"3 buffers",layout:"auto",vertex:{module:V,entryPoint:"vs",buffers:[{arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]},{arrayStride:12,attributes:[{shaderLocation:1,offset:0,format:"float32x3"}]},{arrayStride:8,attributes:[{shaderLocation:2,offset:0,format:"float32x2"}]},{arrayStride:16,attributes:[{shaderLocation:3,offset:0,format:"float32x4"}]}]},fragment:{module:V,entryPoint:"fs",targets:[{format:B}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),_=(...r)=>{const t=Math.max(...r);return 1+Math.log2(t)|0};function F(r,t,o={}){const n=r.createTexture({format:"rgba8unorm",mipLevelCount:o.mips?_(t.width,t.height):1,size:[t.width,t.height],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return r.queue.copyExternalImageToTexture({source:t,flipY:o.flipY},{texture:n},{width:t.width,height:t.height}),n.mipLevelCount>1&&I(r,n),n}const I=(()=>{let r,t;const o={};return function(s,u){t||(t=s.createShaderModule({code:`
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
          `}),r=s.createSampler({minFilter:"linear",magFilter:"linear"})),o[u.format]||(o[u.format]=s.createRenderPipeline({layout:"auto",vertex:{module:t},fragment:{module:t,targets:[{format:u.format}]}}));const R=o[u.format],M=s.createCommandEncoder({label:"mip gen encoder"});for(let d=1;d<u.mipLevelCount;++d)for(let x=0;x<u.depthOrArrayLayers;++x){const te=s.createBindGroup({layout:R.getBindGroupLayout(0),entries:[{binding:0,resource:r},{binding:1,resource:u.createView({dimension:"2d",baseMipLevel:d-1,mipLevelCount:1,baseArrayLayer:x,arrayLayerCount:1})}]}),ne={label:"our basic canvas renderPass",colorAttachments:[{view:u.createView({dimension:"2d",baseMipLevel:d,mipLevelCount:1,baseArrayLayer:x,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},h=M.beginRenderPass(ne);h.setPipeline(R),h.setBindGroup(0,te),h.draw(6),h.end()}const ee=M.finish();s.queue.submit([ee])}})();async function E(r){const o=await(await fetch(r)).blob();return await createImageBitmap(o,{colorSpaceConversion:"none"})}async function g(r,t,o){const n=await E(t);return F(r,n,o)}const H=e.createSampler({addressModeU:"repeat",addressModeV:"repeat",magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),y=268,C=e.createBuffer({label:"uniforms",size:y,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),f=new Float32Array(y/4),j=f.subarray(0,16),A=f.subarray(16,32),m=f.subarray(32,48),b=f.subarray(48,64),N=f.subarray(64,67),D=new re,q=await D.load("/webgpu-render-lab/assets/obj/helmet.obj"),i=D.parse(q),Y=i.indices.length,P=e.createBuffer({label:"vertex buffer vertices",size:i.positions.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(P,0,i.positions.buffer);const G=e.createBuffer({label:"uv buffer",size:i.uvs.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(G,0,i.uvs.buffer);const L=e.createBuffer({label:"normal buffer",size:i.normals.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(L,0,i.normals.buffer);const W=e.createBuffer({label:"tangent buffer",size:i.tangents.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(W,0,i.tangents.buffer);const U=e.createBuffer({label:"index buffer",size:i.indices.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(U,0,i.indices.buffer);const X=e.createBindGroup({label:"bind group for object",layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:C}}]}),k=await g(e,"/webgpu-render-lab/assets/obj/textures/BaseColor.jpg",{mips:!0,flipY:!0}),J=await g(e,"/webgpu-render-lab/assets/obj/textures/Normal.jpg",{mips:!0,flipY:!0}),K=await g(e,"/webgpu-render-lab/assets/obj/textures/Metallic_Roughness.jpg",{mips:!0,flipY:!0}),Q=await g(e,"/webgpu-render-lab/assets/obj/textures/Emissive.jpg",{mips:!0,flipY:!0}),Z=await g(e,"/webgpu-render-lab/assets/obj/textures/Occlusion.jpg",{mips:!0,flipY:!0}),$=e.createBindGroup({label:"bind group for pbr textures",layout:v.getBindGroupLayout(1),entries:[{binding:0,resource:H},{binding:1,resource:k.createView()},{binding:2,resource:J.createView()},{binding:3,resource:K.createView()},{binding:4,resource:Q.createView()},{binding:5,resource:Z.createView()}]}),S={label:"our basic canvas renderPass",colorAttachments:[{view:void 0,loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:void 0,depthLoadOp:"clear",depthStoreOp:"store",depthClearValue:1}};let l=null;function O(r){r*=.001;const t=w.getCurrentTexture();S.colorAttachments[0].view=t.createView(),(!l||l.width!==a.width||l.height!==a.height)&&(l&&l.destroy(),l=e.createTexture({size:[a.width,a.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT})),S.depthStencilAttachment.view=l.createView();const o=e.createCommandEncoder(),n=o.beginRenderPass(S);n.setPipeline(v),n.setVertexBuffer(0,P),n.setVertexBuffer(1,L),n.setVertexBuffer(2,G),n.setVertexBuffer(3,W),n.setIndexBuffer(U,"uint32");const s=a.clientWidth/a.clientHeight;c.perspective(60*Math.PI/180,s,.1,10,j),N.set([0,0,4]),c.lookAt(N,[0,0,0],[0,1,0],A),c.identity(m),c.rotateX(m,r*-.1,m),c.rotateY(m,r*-.2,m),c.inverse(m,b),c.transpose(b,b),e.queue.writeBuffer(C,0,f),n.setBindGroup(0,X),n.setBindGroup(1,$),n.drawIndexed(Y),n.end(),e.queue.submit([o.finish()]),requestAnimationFrame(O)}requestAnimationFrame(O),new ResizeObserver(r=>{for(const t of r){const o=t.target,n=t.contentBoxSize[0].inlineSize,s=t.contentBoxSize[0].blockSize;o.width=Math.max(1,Math.min(n,e.limits.maxTextureDimension2D)),o.height=Math.max(1,Math.min(s,e.limits.maxTextureDimension2D))}}).observe(a)}ae().catch(p=>{console.error(p),alert(p.message)});
