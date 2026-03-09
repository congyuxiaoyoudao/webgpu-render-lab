struct Uniforms {
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
