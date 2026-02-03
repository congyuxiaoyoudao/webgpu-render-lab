import"./modulepreload-polyfill-B5Qt9EMX.js";import{m as c}from"./wgpu-matrix.module-Do896bM9.js";import{G as le}from"./lil-gui.esm-hsJpI9MV.js";const pe=`struct Uniforms {
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
}`;function fe(){const s=new Float32Array([-1,1,1,0,0,1,-1,-1,1,0,0,1,1,1,1,0,0,1,1,-1,1,0,0,1,1,1,-1,1,0,0,1,1,1,1,0,0,1,-1,-1,1,0,0,1,-1,1,1,0,0,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,-1,-1,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,1,-1,1,0,-1,0,-1,-1,1,0,-1,0,1,-1,-1,0,-1,0,-1,-1,-1,0,-1,0,-1,1,1,0,1,0,1,1,1,0,1,0,-1,1,-1,0,1,0,1,1,-1,0,1,0]),e=new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,12,13,14,14,13,15,16,17,18,18,17,19,20,21,22,22,21,23]);return{vertexData:s,indexData:e,numVertices:e.length}}async function de(){const s=await navigator.gpu?.requestAdapter();if(!s)throw new Error("Cannot get GPU adapter.");const e=await s.requestDevice();if(!e)throw new Error("need a browser that supports WebGPU");const l=document.querySelector("canvas");if(!l)throw new Error("Cannot get canvas.");const P=l.getContext("webgpu"),h=navigator.gpu.getPreferredCanvasFormat();P.configure({device:e,format:h,alphaMode:"premultiplied"});const O=e.createShaderModule({code:`
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
  `}),B=e.createRenderPipeline({label:"2 attributes",layout:"auto",vertex:{module:O,entryPoint:"vs",buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]}]},fragment:{module:O,entryPoint:"fs",targets:[{format:h}]},primitive:{cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}}),J=pe,T=e.createShaderModule({code:J}),U=e.createRenderPipeline({label:"0 attributes",layout:"auto",vertex:{module:T,entryPoint:"vs"},fragment:{module:T,entryPoint:"fs",targets:[{format:h}]},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal",format:"depth24plus"}}),K=(...o)=>{const r=Math.max(...o);return 1+Math.log2(r)|0};function Q(o,r,n,{flipY:a}={}){n.forEach((t,i)=>{o.queue.copyExternalImageToTexture({source:t,flipY:a},{texture:r,origin:[0,0,i]},{width:t.width,height:t.height})}),r.mipLevelCount>1&&$(o,r)}function Z(o,r,n={}){const a=r[0],t=o.createTexture({format:"rgba8unorm",mipLevelCount:n.mips?K(a.width,a.height):1,size:[a.width,a.height,r.length],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return Q(o,t,r,n),t}const $=(()=>{let o,r;const n={};return function(t,i){r||(r=t.createShaderModule({code:`
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
          `}),o=t.createSampler({minFilter:"linear",magFilter:"linear"})),n[i.format]||(n[i.format]=t.createRenderPipeline({layout:"auto",vertex:{module:r},fragment:{module:r,targets:[{format:i.format}]}}));const m=n[i.format],H=t.createCommandEncoder({label:"mip gen encoder"});for(let g=1;g<i.mipLevelCount;++g)for(let v=0;v<i.depthOrArrayLayers;++v){const ue=t.createBindGroup({layout:m.getBindGroupLayout(0),entries:[{binding:0,resource:o},{binding:1,resource:i.createView({dimension:"2d",baseMipLevel:g-1,mipLevelCount:1,baseArrayLayer:v,arrayLayerCount:1})}]}),ce={label:"our basic canvas renderPass",colorAttachments:[{view:i.createView({dimension:"2d",baseMipLevel:g,mipLevelCount:1,baseArrayLayer:v,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},b=H.beginRenderPass(ce);b.setPipeline(m),b.setBindGroup(0,ue),b.draw(6),b.end()}const se=H.finish();t.queue.submit([se])}})();async function ee(o){const n=await(await fetch(o)).blob();return await createImageBitmap(n,{colorSpaceConversion:"none"})}async function te(o,r,n){const a=await Promise.all(r.map(ee));return Z(o,a,n)}const M=await te(e,["https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg"],{mips:!0,flipY:!1}),V=e.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),C=208,G=e.createBuffer({label:"uniforms",size:C,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),p=new Float32Array(C/4),D=0,I=16,k=32,z=48,A=p.subarray(D,D+16),E=p.subarray(I,I+16),f=p.subarray(k,k+16),L=p.subarray(z,z+3),{vertexData:x,indexData:re,numVertices:ne}=fe(),R=e.createBuffer({label:"vertex buffer vertices",size:x.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(R,0,x);const _=e.createBuffer({label:"index buffer",size:x.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(_,0,re);const oe=e.createBindGroup({label:"bind group for object",layout:B.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:G}},{binding:1,resource:V},{binding:2,resource:M.createView({dimension:"cube"})}]}),F=64,j=e.createBuffer({label:"uniforms",size:F,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),N=new Float32Array(F/4),q=0,ae=N.subarray(q,q+16),ie=e.createBindGroup({label:"bind group for skybox",layout:U.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:j}},{binding:1,resource:V},{binding:2,resource:M.createView({dimension:"cube"})}]}),w={label:"our basic canvas renderPass",colorAttachments:[{loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}};let u;const d={cameraRotateSpeed:.5,cubeRotateSpeed:.5},Y=new le;Y.add(d,"cameraRotateSpeed",.01,1),Y.add(d,"cubeRotateSpeed",.01,2);let y=0,S=0,W=0;function X(o){o*=.001;const r=o-W;W=o;const n=P.getCurrentTexture();w.colorAttachments[0].view=n.createView(),(!u||u.width!==n.width||u.height!==n.height)&&(u&&u.destroy(),u=e.createTexture({size:[n.width,n.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT})),w.depthStencilAttachment.view=u;const a=e.createCommandEncoder(),t=a.beginRenderPass(w),i=l.clientWidth/l.clientHeight;c.perspective(60*Math.PI/180,i,.1,10,A),y+=r*d.cameraRotateSpeed,L.set([4*Math.cos(y),0,4*Math.sin(y)]),c.lookAt(L,[0,0,0],[0,1,0],E),c.identity(f),S+=r*d.cubeRotateSpeed,c.rotateX(f,S,f),c.rotateY(f,S*2,f);const m=c.multiply(A,E);c.inverse(m,ae),e.queue.writeBuffer(G,0,p),e.queue.writeBuffer(j,0,N),t.setPipeline(B),t.setVertexBuffer(0,R),t.setIndexBuffer(_,"uint16"),t.setBindGroup(0,oe),t.drawIndexed(ne),t.setPipeline(U),t.setBindGroup(0,ie),t.draw(3),t.end(),e.queue.submit([a.finish()]),requestAnimationFrame(X)}requestAnimationFrame(X),new ResizeObserver(o=>{for(const r of o){const n=r.target,a=r.contentBoxSize[0].inlineSize,t=r.contentBoxSize[0].blockSize;n.width=Math.max(1,Math.min(a,e.limits.maxTextureDimension2D)),n.height=Math.max(1,Math.min(t,e.limits.maxTextureDimension2D))}}).observe(l)}de().catch(s=>{console.error(s),alert(s.message)});
