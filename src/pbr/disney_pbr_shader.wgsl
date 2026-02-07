struct Uniforms {
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
}