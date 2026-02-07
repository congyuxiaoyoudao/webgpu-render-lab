import"./modulepreload-polyfill-B5Qt9EMX.js";import{m}from"./wgpu-matrix.module-Do896bM9.js";import{O as ee}from"./objLoader-CDcZvcos.js";const te=`struct Uniforms {
    projection: mat4x4f,
    view: mat4x4f,
    world: mat4x4f,
    cameraPosition: vec3f,
};

struct Vertex {
    @location(0) position: vec3f,
    @location(1) uv: vec2f,
    @location(2) normal: vec3f,
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
    var out: VertexOutput;
    let position = vec4f(vert.position, 1.0);
    out.position = uni.projection * uni.view * uni.world * position;
    out.worldPosition = (uni.world * position).xyz;
    out.worldNormal = (uni.world * vec4f(vert.normal, 0)).xyz;
    return out;
}

@fragment fn fs(in: VertexOutput) -> @location(0) vec4f {
    let worldNormal = normalize(in.worldNormal);
    let eyeToSurfaceDir = normalize(in.worldPosition - uni.cameraPosition);
    let direction = reflect(eyeToSurfaceDir, worldNormal);

    let reflectCol = textureSample(Texture, Sampler, direction);
    return vec4f(in.worldNormal * 0.5 + 0.5, 1.0);
}`;async function re(){const l=await navigator.gpu?.requestAdapter();if(!l)throw new Error("Cannot get GPU adapter.");const t=await l.requestDevice();if(!t)throw new Error("need a browser that supports WebGPU");const u=document.querySelector("canvas");if(!u)throw new Error("Cannot get canvas.");const v=u.getContext("webgpu"),w=navigator.gpu.getPreferredCanvasFormat();v.configure({device:t,format:w,alphaMode:"premultiplied"});const A=te,x=t.createShaderModule({code:A}),y=t.createRenderPipeline({label:"3 buffers",layout:"auto",vertex:{module:x,entryPoint:"vs",buffers:[{arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]},{arrayStride:8,attributes:[{shaderLocation:1,offset:0,format:"float32x2"}]},{arrayStride:12,attributes:[{shaderLocation:2,offset:0,format:"float32x3"}]}]},fragment:{module:x,entryPoint:"fs",targets:[{format:w}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),j=(...r)=>{const e=Math.max(...r);return 1+Math.log2(e)|0};function F(r,e,o,{flipY:n}={}){o.forEach((a,s)=>{r.queue.copyExternalImageToTexture({source:a,flipY:n},{texture:e,origin:[0,0,s]},{width:a.width,height:a.height})}),e.mipLevelCount>1&&N(r,e)}function I(r,e,o={}){const n=e[0],a=r.createTexture({format:"rgba8unorm",mipLevelCount:o.mips?j(n.width,n.height):1,size:[n.width,n.height,e.length],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return F(r,a,e,o),a}const N=(()=>{let r,e;const o={};return function(a,s){e||(e=a.createShaderModule({code:`
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
          `}),r=a.createSampler({minFilter:"linear",magFilter:"linear"})),o[s.format]||(o[s.format]=a.createRenderPipeline({layout:"auto",vertex:{module:e},fragment:{module:e,targets:[{format:s.format}]}}));const D=o[s.format],_=a.createCommandEncoder({label:"mip gen encoder"});for(let d=1;d<s.mipLevelCount;++d)for(let g=0;g<s.depthOrArrayLayers;++g){const Z=a.createBindGroup({layout:D.getBindGroupLayout(0),entries:[{binding:0,resource:r},{binding:1,resource:s.createView({dimension:"2d",baseMipLevel:d-1,mipLevelCount:1,baseArrayLayer:g,arrayLayerCount:1})}]}),$={label:"our basic canvas renderPass",colorAttachments:[{view:s.createView({dimension:"2d",baseMipLevel:d,mipLevelCount:1,baseArrayLayer:g,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},b=_.beginRenderPass($);b.setPipeline(D),b.setBindGroup(0,Z),b.draw(6),b.end()}const Q=_.finish();a.queue.submit([Q])}})();async function R(r){const o=await(await fetch(r)).blob();return await createImageBitmap(o,{colorSpaceConversion:"none"})}async function k(r,e,o){const n=await Promise.all(e.map(R));return I(r,n,o)}const q=await k(t,["https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg"],{mips:!0,flipY:!1}),Y=t.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),P=208,B=t.createBuffer({label:"uniforms",size:P,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),f=new Float32Array(P/4),T=0,S=16,U=32,O=48,X=f.subarray(T,T+16),W=f.subarray(S,S+16),p=f.subarray(U,U+16),V=f.subarray(O,O+3),C=new ee,H=await C.load("/webgpu-render-lab/assets/obj/suzanne.obj"),i=C.parse(H),J=i.indices.length;console.log(i.indices.slice(0,30)),console.log(i.indices.length);const G=t.createBuffer({label:"vertex buffer vertices",size:i.positions.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(G,0,i.positions.buffer);const L=t.createBuffer({label:"uv buffer",size:i.uvs.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(L,0,i.uvs.buffer);const E=t.createBuffer({label:"normal buffer",size:i.normals.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(E,0,i.normals.buffer);const z=t.createBuffer({label:"index buffer",size:i.indices.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(z,0,i.indices.buffer);const K=t.createBindGroup({label:"bind group for object",layout:y.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:B}},{binding:1,resource:Y},{binding:2,resource:q.createView({dimension:"cube"})}]}),h={label:"our basic canvas renderPass",colorAttachments:[{loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{depthLoadOp:"clear",depthStoreOp:"store",depthClearValue:1}};let c=null;function M(r){r*=.001;const e=v.getCurrentTexture();h.colorAttachments[0].view=e.createView(),(!c||c.width!==u.width||c.height!==u.height)&&(c&&c.destroy(),c=t.createTexture({size:[u.width,u.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT})),h.depthStencilAttachment.view=c.createView();const o=t.createCommandEncoder(),n=o.beginRenderPass(h);n.setPipeline(y),n.setVertexBuffer(0,G),n.setVertexBuffer(1,L),n.setVertexBuffer(2,E),n.setIndexBuffer(z,"uint32");const a=u.clientWidth/u.clientHeight;m.perspective(60*Math.PI/180,a,.1,10,X),V.set([0,0,4]),m.lookAt(V,[0,0,0],[0,1,0],W),m.identity(p),m.rotateX(p,r*-.1,p),m.rotateY(p,r*-.2,p),t.queue.writeBuffer(B,0,f),n.setBindGroup(0,K),n.drawIndexed(J),n.end(),t.queue.submit([o.finish()]),requestAnimationFrame(M)}requestAnimationFrame(M),new ResizeObserver(r=>{for(const e of r){const o=e.target,n=e.contentBoxSize[0].inlineSize,a=e.contentBoxSize[0].blockSize;o.width=Math.max(1,Math.min(n,t.limits.maxTextureDimension2D)),o.height=Math.max(1,Math.min(a,t.limits.maxTextureDimension2D))}}).observe(u)}re().catch(l=>{console.error(l),alert(l.message)});
