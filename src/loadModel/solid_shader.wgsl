struct Uniforms {
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
}