import"./modulepreload-polyfill-B5Qt9EMX.js";import{m as f}from"./wgpu-matrix.module-Do896bM9.js";import{G as K}from"./lil-gui.esm-hsJpI9MV.js";function Q(){const s=new Float32Array([-1,1,1,0,0,1,-1,-1,1,0,0,1,1,1,1,0,0,1,1,-1,1,0,0,1,1,1,-1,1,0,0,1,1,1,1,0,0,1,-1,-1,1,0,0,1,-1,1,1,0,0,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,-1,-1,1,1,-1,0,0,-1,1,-1,-1,0,0,-1,-1,1,-1,0,0,-1,-1,-1,-1,0,0,1,-1,1,0,-1,0,-1,-1,1,0,-1,0,1,-1,-1,0,-1,0,-1,-1,-1,0,-1,0,-1,1,1,0,1,0,1,1,1,0,1,0,-1,1,-1,0,1,0,1,1,-1,0,1,0]),t=new Uint16Array([0,1,2,2,1,3,4,5,6,6,5,7,8,9,10,10,9,11,12,13,14,14,13,15,16,17,18,18,17,19,20,21,22,22,21,23]);return{vertexData:s,indexData:t,numVertices:t.length}}async function $(){const s=await navigator.gpu?.requestAdapter();if(!s)throw new Error("Cannot get GPU adapter.");const t=await s.requestDevice();if(!t)throw new Error("need a browser that supports WebGPU");const u=document.querySelector("canvas");if(!u)throw new Error("Cannot get canvas.");const h=u.getContext("webgpu"),w=navigator.gpu.getPreferredCanvasFormat();h.configure({device:t,format:w,alphaMode:"premultiplied"});const y=t.createShaderModule({code:`
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
  `}),P=t.createRenderPipeline({label:"2 attributes",layout:"auto",vertex:{module:y,entryPoint:"vs",buffers:[{arrayStride:24,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"}]}]},fragment:{module:y,entryPoint:"fs",targets:[{format:w}]},primitive:{cullMode:"back"}}),z=(...r)=>{const e=Math.max(...r);return 1+Math.log2(e)|0};function E(r,e,o,{flipY:n}={}){o.forEach((a,i)=>{r.queue.copyExternalImageToTexture({source:a,flipY:n},{texture:e,origin:[0,0,i]},{width:a.width,height:a.height})}),e.mipLevelCount>1&&F(r,e)}function A(r,e,o={}){const n=e[0],a=r.createTexture({format:"rgba8unorm",mipLevelCount:o.mips?z(n.width,n.height):1,size:[n.width,n.height,e.length],usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return E(r,a,e,o),a}const F=(()=>{let r,e;const o={};return function(a,i){e||(e=a.createShaderModule({code:`
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
          `}),r=a.createSampler({minFilter:"linear",magFilter:"linear"})),o[i.format]||(o[i.format]=a.createRenderPipeline({layout:"auto",vertex:{module:e},fragment:{module:e,targets:[{format:i.format}]}}));const L=o[i.format],M=a.createCommandEncoder({label:"mip gen encoder"});for(let m=1;m<i.mipLevelCount;++m)for(let d=0;d<i.depthOrArrayLayers;++d){const Z=a.createBindGroup({layout:L.getBindGroupLayout(0),entries:[{binding:0,resource:r},{binding:1,resource:i.createView({dimension:"2d",baseMipLevel:m-1,mipLevelCount:1,baseArrayLayer:d,arrayLayerCount:1})}]}),J={label:"our basic canvas renderPass",colorAttachments:[{view:i.createView({dimension:"2d",baseMipLevel:m,mipLevelCount:1,baseArrayLayer:d,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]},g=M.beginRenderPass(J);g.setPipeline(L),g.setBindGroup(0,Z),g.draw(6),g.end()}const H=M.finish();a.queue.submit([H])}})();async function _(r){const o=await(await fetch(r)).blob();return await createImageBitmap(o,{colorSpaceConversion:"none"})}async function k(r,e,o){const n=await Promise.all(e.map(_));return A(r,n,o)}const j=await k(t,["https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-x.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-y.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/pos-z.jpg","https://webgpufundamentals.org/webgpu/resources/images/leadenhall_market/neg-z.jpg"],{mips:!0,flipY:!1}),q=t.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),B=208,S=t.createBuffer({label:"uniforms",size:B,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),c=new Float32Array(B/4),T=0,O=16,U=32,C=48,N=c.subarray(T,T+16),R=c.subarray(O,O+16),l=c.subarray(U,U+16),V=c.subarray(C,C+3),{vertexData:b,indexData:Y,numVertices:X}=Q(),G=t.createBuffer({label:"vertex buffer vertices",size:b.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(G,0,b);const D=t.createBuffer({label:"index buffer",size:b.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST});t.queue.writeBuffer(D,0,Y);const W=t.createBindGroup({label:"bind group for object",layout:P.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:S}},{binding:1,resource:q},{binding:2,resource:j.createView({dimension:"cube"})}]}),I={label:"our basic canvas renderPass",colorAttachments:[{loadOp:"clear",storeOp:"store"}]},v={rotation:[25,40,0]},p=new K;p.onChange(x),p.add(v.rotation,0,-360,360,1).name("rotationX"),p.add(v.rotation,1,-360,360,1).name("rotationY"),p.add(v.rotation,2,-360,360,1).name("rotationZ");function x(r){r*=.001;const e=h.getCurrentTexture();I.colorAttachments[0].view=e.createView();const o=t.createCommandEncoder(),n=o.beginRenderPass(I);n.setPipeline(P),n.setVertexBuffer(0,G),n.setIndexBuffer(D,"uint16");const a=u.clientWidth/u.clientHeight;f.perspective(60*Math.PI/180,a,.1,10,N),V.set([0,0,4]),f.lookAt(V,[0,0,0],[0,1,0],R),f.identity(l),f.rotateX(l,r*-.1,l),f.rotateY(l,r*-.2,l),t.queue.writeBuffer(S,0,c),n.setBindGroup(0,W),n.drawIndexed(X),n.end(),t.queue.submit([o.finish()]),requestAnimationFrame(x)}requestAnimationFrame(x),new ResizeObserver(r=>{for(const e of r){const o=e.target,n=e.contentBoxSize[0].inlineSize,a=e.contentBoxSize[0].blockSize;o.width=Math.max(1,Math.min(n,t.limits.maxTextureDimension2D)),o.height=Math.max(1,Math.min(a,t.limits.maxTextureDimension2D))}}).observe(u)}$().catch(s=>{console.error(s),alert(s.message)});
