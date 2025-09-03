import { ArcballCamera } from "arcball_camera";
import { Controller } from "ez_canvas_controller";
import { GUI } from 'lil-gui'
import { mat4, vec3 } from "wgpu-matrix";
import { PlyLoader } from "./loadPly";
import { Splats } from "./splats";

export class RenderEngine {
    public static async init(canvas: HTMLCanvasElement) {
     // 1. INITIALIZE GPU CONTEXT
      if (navigator.gpu == null) {
        throw new Error('WebGPU not supported on this browser.');
      }
  
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter == null) {
        throw new Error('Failed to request GPU adapter.');
      }
  
      const device = await adapter.requestDevice();
      if (device == null) {
        throw new Error('Failed to request GPU device.');
      }
  
      const context = canvas.getContext('webgpu');
      if (context == null) {
        throw new Error('Failed to request GPU context.');
      }
  
      context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      })

      // INIT GUI
      const gui = new GUI();
      const object = {
        splatRadius: 1
      }
      gui.add(object, 'splatRadius', 0.1, 2, 0.1);
  
      // 2. CREATE VIEW Bind Group
      const viewParamBindGroupLayout = device?.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {type: 'uniform'},
          },
          {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {type: 'uniform'},
          },
          {
            binding: 2,
            visibility: GPUShaderStage.VERTEX,
            buffer: {type: 'uniform'},
          },
          {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            buffer: {type: 'uniform'},
          }
        ],
      });

      const projectionBuffer = device?.createBuffer({
        size: 16 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const screenSizeBuffer = device?.createBuffer({
        size: 2 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const modelViewBuffer = device?.createBuffer({
        size: 16 * Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const splatRadiusBuffer = device.createBuffer({
        size: Float32Array.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      })

      const viewParamBindGroup = device?.createBindGroup({
        layout: viewParamBindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: {buffer: projectionBuffer},
          },
          {
            binding: 1,
            resource: {buffer: modelViewBuffer},
          },
          {
            binding: 2,
            resource: {buffer: screenSizeBuffer},
          },
          {
            binding: 3,
            resource: {buffer: splatRadiusBuffer},
          }
        ],
      });
  
      // 3. LOAD PLY FILE
      const response = await fetch('/assets/ply/food.ply')
      const blob = await response.blob()
      const file = new File([blob], 'food.ply')
      
      const parser = new PlyLoader()
      await parser.loadPlyFile(file)
  
      // const points = new Points(device, parser.getSplattifiedVertices(), viewParamBindGroupLayout)
      const splats = new Splats(device, parser.getSplattifiedVertices(), viewParamBindGroupLayout)

      // 4. CREATE CAMERA AND CONTROLLER
      const camera = new ArcballCamera(
        [0, 0, -1], 
        [0, 0, 0], 
        [0, 1, 0], 
        1.0, 
        [
          canvas.width,
          canvas.height,
        ]
      );
  
      // 5. CREATE RENDER PASS AND FRAME LOOP
      const renderPassDesc: GPURenderPassDescriptor = {
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            storeOp: "store"
        }]
      };

      let lastCamPos = vec3.zero();
      const frame = function() {
        // 6. UPDATE VIEW PARAMETERS EACH FRAME USING CAMERA
        let shouldUpdate = false;
        if(vec3.distance(lastCamPos, camera.eyePos())>0.5){
            lastCamPos = vec3.create(camera.eyePos()[0],camera.eyePos()[1],camera.eyePos()[2]);
            shouldUpdate = true;
        }
        // incase we change canvas size
        const projection = mat4.perspective(
            1.4,
            canvas.width / canvas.height,
            0.001,
            5000
        );
        const projectionUpdateBuffer = device.createBuffer({
          size: 16 * Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true
        });
        const viewProjMap = new Float32Array(projectionUpdateBuffer.getMappedRange());
        viewProjMap.set(projection);
        projectionUpdateBuffer.unmap();

        const modelViewUpdateBuffer = device.createBuffer({
          size: 16 * Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true
        });
        const modelViewMap = new Float32Array(modelViewUpdateBuffer.getMappedRange());
        modelViewMap.set(camera.camera);
        modelViewUpdateBuffer.unmap();

        const screenSizeUpdateBuffer = device.createBuffer({
          size: 2 * Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true
        });
        const screenSizeMap = new Float32Array(screenSizeUpdateBuffer.getMappedRange());
        screenSizeMap.set([canvas.width, canvas.height]);
        screenSizeUpdateBuffer.unmap();

        const splatRadiusUpdateBuffer = device.createBuffer({
          size: Float32Array.BYTES_PER_ELEMENT,
          usage: GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true
        });
        const splatRadiusMap = new Float32Array(splatRadiusUpdateBuffer.getMappedRange());
        splatRadiusMap[0] = object.splatRadius;
        splatRadiusUpdateBuffer.unmap();

        // Update the view in the render pass descriptor each frame
        (renderPassDesc.colorAttachments as GPURenderPassColorAttachment[])[0].view = context.getCurrentTexture().createView();

        // 7. CREATE COMMAND ENCODER AND RENDER PASS
        const commandEncoder = device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(projectionUpdateBuffer, 0, projectionBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
        commandEncoder.copyBufferToBuffer(screenSizeUpdateBuffer, 0, screenSizeBuffer, 0, 2 * Float32Array.BYTES_PER_ELEMENT);
        commandEncoder.copyBufferToBuffer(modelViewUpdateBuffer, 0, modelViewBuffer, 0, 16 * Float32Array.BYTES_PER_ELEMENT);
        commandEncoder.copyBufferToBuffer(splatRadiusUpdateBuffer, 0, splatRadiusBuffer, 0, Float32Array.BYTES_PER_ELEMENT)
        const basisUpdateBuffer = splats.updateBasisBuffer(device, projection, camera.camera, canvas, commandEncoder); 
        let splatIndexBuffer: GPUBuffer | null = null;
        if (shouldUpdate) {
          splatIndexBuffer = splats.updateSplatIndexBuffer(device, projection, camera.camera, commandEncoder);
        }

        const renderPass = commandEncoder.beginRenderPass(renderPassDesc);
        splats.render(renderPass, viewParamBindGroup);
        // points.render(renderPass, viewParamBindGroup);
        renderPass.end();
  
        device.queue.submit([commandEncoder.finish()]);
        projectionUpdateBuffer.destroy();
        screenSizeUpdateBuffer.destroy();
        modelViewUpdateBuffer.destroy();
        splatRadiusUpdateBuffer.destroy();
        basisUpdateBuffer.destroy();
        if (splatIndexBuffer != null) {
          splatIndexBuffer.destroy();
        }
      }

      requestAnimationFrame(frame)
      let timeId: any = null;
      const resizeObserver = new ResizeObserver((_entries) => {
          if (timeId) {
              clearTimeout(timeId);
          }
          timeId = setTimeout(() => {
              requestAnimationFrame(frame);
          }, 100);
      });
      requestAnimationFrame(frame);
      resizeObserver.observe(canvas);


      // Create camera system
      const controller = new Controller();
  
      controller.mousemove = function (prev: any, cur: any, event: { buttons: number; }) {
          if (event.buttons == 1) {// left button
              camera.rotate(prev, cur);
              requestAnimationFrame(frame);
          } else if (event.buttons == 4) { // middle button
              camera.pan([cur[0] - prev[0], prev[1] - cur[1]]);
              requestAnimationFrame(frame);
          }
      }
      controller.wheel = function (amount: number) {
          camera.zoom(amount * 2);
          requestAnimationFrame(frame);
      }
      controller.registerForCanvas(canvas);
    }
  }
