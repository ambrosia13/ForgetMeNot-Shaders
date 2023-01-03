#include forgetmenot:shaders/lib/materials.glsl

float endStoneNoise(in vec2 uv) {
    if(frx_luminance(frx_fragColor.rgb) < 0.5) return 2.0 * max(fmn_fbm2D(uv * 0.75, 4, 0.0) * 4.0, fmn_fbm2D(uv * 0.5 + 10.0, 4, 0.0) * 4.0);
    return (cellular2x2(uv).x) * 6.0;
}

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);
        uv = floor(uv * 16.0) / 8.0;
        float sampleOffset = 1e-2;

        float centerNoise = endStoneNoise(uv);

        float height1 = endStoneNoise(uv + vec2(sampleOffset, 0.0));
        // float height2 = waterHeightNoise(uv - vec2(sampleOffset, 0.0));
        float height3 = endStoneNoise(uv + vec2(0.0, sampleOffset));
        // float height4 = waterHeightNoise(uv - vec2(0.0, sampleOffset));

        float deltaX = (centerNoise - height1) * 0.5;
        float deltaY = (centerNoise - height3) * 0.5;

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
        frx_fragNormal = fmn_fNormalize(frx_fragNormal);

        if(frx_luminance(frx_fragColor.rgb) < 0.5) {
            frx_fragRoughness = 0.0;
        } else {
            frx_fragRoughness = 0.1;
        }
    #endif
}
