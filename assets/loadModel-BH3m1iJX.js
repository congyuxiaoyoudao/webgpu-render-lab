import"./modulepreload-polyfill-B5Qt9EMX.js";import{m as T}from"./wgpu-matrix.module-Do896bM9.js";class ee{constructor(){}async load(e){const s=await fetch(e);if(!s.ok)throw new Error(`ObjLoader could not fine file at ${e}. Please check your path.`);const l=await s.text();if(l.length===0)throw new Error(`${e} File is empty.`);return l}parse(e){const s=e?.split(`
`),l=[],h=[],S=[],b=[];for(const f of s){const p=f.trim(),[x,...i]=p.split(" ");switch(x){case"v":l.push(i.map(parseFloat));break;case"vt":b.push(i.map(Number));break;case"vn":S.push(i.map(parseFloat));break;case"f":h.push(i);break}}const v=[],U=[],O=[],w=[];{const f={};let p=0;for(const x of h)for(const i of x){if(f[i]!==void 0){w.push(f[i]);continue}f[i]=p,w.push(p);const[V,y,P]=i.split("/").map(m=>Number(m)-1);V>-1&&v.push(...l[V]),y>-1&&O.push(...b[y]),P>-1&&U.push(...S[P]),p+=1}}return{positions:new Float32Array(v),uvs:new Float32Array(O),normals:new Float32Array(U),indices:new Uint32Array(w)}}}const te=`struct Uniforms {
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
}`;async function re(){const g=await navigator.gpu?.requestAdapter();if(!g)throw new Error("Cannot get GPU adapter.");const e=await g.requestDevice();if(!e)throw new Error("need a browser that supports WebGPU");const s=document.querySelector("canvas");if(!s)throw new Error("Cannot get canvas.");const l=s.getContext("webgpu"),h=navigator.gpu.getPreferredCanvasFormat();l.configure({device:e,format:h,alphaMode:"premultiplied"});const S=te,b=e.createShaderModule({code:S}),v=e.createRenderPipeline({label:"3 buffers",layout:"auto",vertex:{module:b,entryPoint:"vs",buffers:[{arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:"float32x3"}]},{arrayStride:8,attributes:[{shaderLocation:1,offset:0,format:"float32x2"}]},{arrayStride:12,attributes:[{shaderLocation:2,offset:0,format:"float32x3"}]}]},fragment:{module:b,entryPoint:"fs",targets:[{format:h}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),U=(...r)=>{const t=Math.max(...r);return 1+Math.log2(t)|0};function O(r,t,o,{flipY:n}={}){o.forEach((a,c)=>{r.queue.copyExternalImageToTexture({source:a,flipY:n},{texture:t,origin:[0,0,c]},{width:a.width,height:a.height})}),t.mipLevelCount>1&&f(r,t)}function w(r,t,o={}){const n=t[0],a=r.createTexture({format:"rgba8unorm",mipLevelCount:o.mips?U(n.width,n.height):1,size:[n.width,n.height,t.length],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return O(r,a,t,o),a}const f=(()=>{let r,t;const o={};return function(a,c){t||(t=a.createShaderModule({code:`
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
          `}),r=a.createSampler({minFilter:"linear",magFilter:"linear"})),o[c.format]||(o[c.format]=a.createRenderPipeline({layout:"auto",vertex:{module:t},fragment:{module:t,targets:[{format:c.format}]}}));const q=o[c.format],Y=a.createCommandEncoder({label:"mip gen encoder"});for(let C=1;C<c.mipLevelCount;++C)for(let L=0;L<c.depthOrArrayLayers;++L){const Q=a.createBindGroup({layout:q.getBindGroupLayout(0),entries:[{binding:0,resource:r},{binding:1,resource:c.createView({dimension:"2d",baseMipLevel:C-1,mipLevelCount:1,baseArrayLayer:L,arrayLayerCount:1})}]}),Z={label:"our basic canvas renderPass",colorAttachments:[{view:c.createView({dimension:"2d",baseMipLevel:C,mipLevelCount:1,baseArrayLayer:L,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},E=Y.beginRenderPass(Z);E.setPipeline(q),E.setBindGroup(0,Q),E.draw(6),E.end()}const K=Y.finish();a.queue.submit([K])}})();async function p(r){const o=await(await fetch(r)).blob();return await createImageBitmap(o,{colorSpaceConversion:"none"})}async function x(r,t,o){const n=await Promise.all(t.map(p));return w(r,n,o)}const i=await x(e,["https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg"],{mips:!0,flipY:!1}),V=e.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),y=208,P=e.createBuffer({label:"uniforms",size:y,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),m=new Float32Array(y/4),F=0,z=16,A=32,M=48,X=m.subarray(F,F+16),W=m.subarray(z,z+16),B=m.subarray(A,A+16),k=m.subarray(M,M+3),D=new ee,H=await D.load("/webgpu-render-lab/assets/obj/suzanne.obj"),u=D.parse(H),$=u.indices.length;console.log(u.indices.slice(0,30)),console.log(u.indices.length);const I=e.createBuffer({label:"vertex buffer vertices",size:u.positions.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(I,0,u.positions.buffer);const _=e.createBuffer({label:"uv buffer",size:u.uvs.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(_,0,u.uvs.buffer);const N=e.createBuffer({label:"normal buffer",size:u.normals.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(N,0,u.normals.buffer);const j=e.createBuffer({label:"index buffer",size:u.indices.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(j,0,u.indices.buffer);const J=e.createBindGroup({label:"bind group for object",layout:v.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:P}},{binding:1,resource:V},{binding:2,resource:i.createView({dimension:"cube"})}]}),G={label:"our basic canvas renderPass",colorAttachments:[{loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{depthLoadOp:"clear",depthStoreOp:"store",depthClearValue:1}};let d=null;function R(r){r*=.001;const t=l.getCurrentTexture();G.colorAttachments[0].view=t.createView(),(!d||d.width!==s.width||d.height!==s.height)&&(d&&d.destroy(),d=e.createTexture({size:[s.width,s.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT})),G.depthStencilAttachment.view=d.createView();const o=e.createCommandEncoder(),n=o.beginRenderPass(G);n.setPipeline(v),n.setVertexBuffer(0,I),n.setVertexBuffer(1,_),n.setVertexBuffer(2,N),n.setIndexBuffer(j,"uint32");const a=s.clientWidth/s.clientHeight;T.perspective(60*Math.PI/180,a,.1,10,X),k.set([0,0,4]),T.lookAt(k,[0,0,0],[0,1,0],W),T.identity(B),T.rotateX(B,r*-.1,B),T.rotateY(B,r*-.2,B),e.queue.writeBuffer(P,0,m),n.setBindGroup(0,J),n.drawIndexed($),n.end(),e.queue.submit([o.finish()]),requestAnimationFrame(R)}requestAnimationFrame(R),new ResizeObserver(r=>{for(const t of r){const o=t.target,n=t.contentBoxSize[0].inlineSize,a=t.contentBoxSize[0].blockSize;o.width=Math.max(1,Math.min(n,e.limits.maxTextureDimension2D)),o.height=Math.max(1,Math.min(a,e.limits.maxTextureDimension2D))}}).observe(s)}re().catch(g=>{console.error(g),alert(g.message)});
