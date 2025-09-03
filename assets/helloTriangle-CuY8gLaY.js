import{G as x}from"./lil-gui.esm-BXwgAigT.js";async function C(){if(navigator.gpu)console.log("Hello, WebGPU!");else throw new Error("WebGPU is not supported in this browser.");const r=await navigator.gpu.requestAdapter();if(!r)throw new Error("Cannot get GPU adapter.");const e=await r.requestDevice(),a=document.querySelector("canvas").getContext("webgpu"),i=navigator.gpu.getPreferredCanvasFormat();a.configure({device:e,format:i,alphaMode:"premultiplied"});const u=new Float32Array([0,.5,0,1,0,0,1,-.5,-.5,0,0,1,0,1,.5,-.5,0,0,0,1,1]),s=e.createBuffer({size:u.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(s,0,u);const c=e.createShaderModule({code:`
    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
    };
    struct ColorUniform {
      colorA: vec4<f32>,
      colorB: vec4<f32>,
      colorC: vec4<f32>,
    };

    @group(0) @binding(0) var<uniform> uColors: ColorUniform;

    fn getColorByIndex(index: u32) -> vec4<f32> {
      if (index == 0u) {
        return uColors.colorA;
      } else if (index == 1u) {
        return uColors.colorB;
      } else {
        return uColors.colorC;
      }
    }

    @vertex
    fn vs_main(
      @builtin(vertex_index) vertexindex: u32,
      @location(0) pos: vec3<f32>,
      @location(1) color: vec4<f32>
    ) -> VertexOutput {
      var output: VertexOutput;
      output.position = vec4<f32>(pos, 1.0);
      output.color = getColorByIndex(vertexindex);
      return output;
    }

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
      return input.color;
    }
  `}),l=e.createRenderPipeline({layout:"auto",vertex:{module:c,entryPoint:"vs_main",buffers:[{arrayStride:28,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x4"}]}]},fragment:{module:c,entryPoint:"fs_main",targets:[{format:i}]},primitive:{topology:"triangle-list"}}),n=new x,o={colorA:[1,0,0,1],colorB:[0,1,0,1],colorC:[0,0,1,1]};n.addColor(o,"colorA"),n.addColor(o,"colorB"),n.addColor(o,"colorC");const f=e.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),g=e.createBindGroup({layout:l.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:f}}]});function m(){e.queue.writeBuffer(f,0,new Float32Array([...o.colorA,...o.colorB,...o.colorC]))}function d(){m();const p=e.createCommandEncoder(),v={colorAttachments:[{view:a.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]},t=p.beginRenderPass(v);t.setPipeline(l),t.setVertexBuffer(0,s),t.setBindGroup(0,g),t.draw(3),t.end(),e.queue.submit([p.finish()]),requestAnimationFrame(d)}requestAnimationFrame(d)}C().catch(r=>{console.error(r),alert(r.message)});
