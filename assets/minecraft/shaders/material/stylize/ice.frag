#include forgetmenot:shaders/lib/materials.glsl
#include lumi:shaders/api/pbr_ext.glsl

float iceHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = 1.0;

    vec2 coord = uv * 1.5;

    waterHeight += fmn_fbm2D(coord, 2, 0.0) * (3.0 / 2.0) * 0.5 + 0.5;

    waterHeight *= 2.0;
    waterHeight += 0.3;

    return pow(waterHeight, 4.0) * 0.00075;
}

void frx_materialFragment() {
    vec2 uv = floor(frx_var0.xy * 16.0) / 16.0;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #if defined PBR_ENABLED
        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.0;

        uv = frx_normalizeMappedUV(frx_texcoord);
        vec2 uv1, uv2, uv3, uv4;
        vec2 offset = vec2(1.0 / 16.0, 0.0);

        uv1 = uv + offset.xy;
        uv2 = uv - offset.xy;
        uv3 = uv + offset.yx;
        uv4 = uv - offset.yx;


        float height1 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv1))).rgb);
        float height2 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv2))).rgb);
        float height3 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv3))).rgb);
        float height4 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv4))).rgb);

        float deltaX = (height2 - height1) * 1.0;
        float deltaY = (height4 - height3) * 1.0;

        frx_fragNormal = normalize(vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY)));
    #endif

    #ifdef INTERNAL_MATERIALS
        frx_fragColor.rgb *= 0.5;
    #endif

    #if LUMI_PBR_API >= 8
        frx_fragColor.rgb *= 2.0; // I only want to darken ice in forget-me-not shaders
        pbr_f0 = 0.05;
        pbr_roughness = 0.05;
        pbr_isWater = false;
    #endif

    // frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    //frx_fragColor.a *= 0.5;
}