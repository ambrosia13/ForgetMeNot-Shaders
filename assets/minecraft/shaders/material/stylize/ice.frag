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

    return pow(waterHeight, 4.0) * 0.15;
}

void frx_materialFragment() {
    vec2 uv = floor(frx_var0.xy * 16.0) / 16.0;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #if defined PBR_ENABLED
        float offset = 1e-2;

        float centerNoise = iceHeightNoise(uv);
        float height1 = iceHeightNoise(uv + vec2(offset, 0.0));
        // float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
        float height3 = iceHeightNoise(uv + vec2(0.0, offset));
        // float height4 = waterHeightNoise(uv - vec2(0.0, offset));

        float deltaX = (centerNoise - height1) * 2.0;
        float deltaY = (centerNoise - height3) * 2.0;

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
        frx_fragNormal = normalize(frx_fragNormal);

        frx_fragReflectance = 0.06;
        frx_fragRoughness = 0.00;
        //frx_fragEnableDiffuse = false;
    #endif

    frx_fragColor.rgb *= 0.5;

    #if LUMI_PBR_API >= 8
        frx_fragColor.rgb *= 2.0; // I only want to darken ice in forget-me-not shaders
        pbr_f0 = 0.05;
        pbr_roughness = 0.05;
        pbr_isWater = false;
    #endif

    // frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    // frx_fragColor.a *= 0.5;
}