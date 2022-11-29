// --------------------------------------------------------------------------------------------------------
// The contents of the following file are largely referenced and copied from Google's Filament docs
// for educational purposes on learning PBR.
// Link:
// --------------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------------
// Specular BRDF
// --------------------------------------------------------------------------------------------------------
vec3 getReflectance(in vec3 f0, in float NdotV) {
    NdotV = clamp01(NdotV);
    return f0 + (1.0 - f0) * pow((1.0 - NdotV), 5.0);
}
vec3 getReflectance(in vec3 f0, in float NdotV, in float r) {
    float k = 1.0 / inversesqrt(r);
    return f0 + (1.0 - f0) * (pow((1.0 - k) * (1.0 - NdotV) + k * 0.5, 5.0));
}

float distributionGGX(in float NdotH, in float r) {
    float a = NdotH * r;
    float k = r / (1.0 - NdotH * NdotH + a * a);
    return k * k * (1.0 / PI);
}
float geometryGGX(in float NdotV, in float NdotL, in float r) {
    float a = r;
    float GGXV = NdotL * (NdotV * (1.0 - a) + a);
    float GGXL = NdotV * (NdotL * (1.0 - a) + a);
    return 0.5 / (GGXV + GGXL);
}

vec3 specularBRDF(in vec3 N, in vec3 V, in vec3 L, in float f0, in float roughness) {
    vec3 H = fNormalize(V + L);
    float NdotH = clamp01(dot(N, H));
    float NdotV = clamp01(dot(N, V));
    float NdotL = clamp01(dot(N, L));

    float D = distributionGGX(NdotH, roughness);

    return vec3(1.0);
}

// --------------------------------------------------------------------------------------------------------
// Diffuse BRDF
// --------------------------------------------------------------------------------------------------------
const float lambert = 1.0 / PI;