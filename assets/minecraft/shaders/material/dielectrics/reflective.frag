#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.01;

        vec2 uv = frx_normalizeMappedUV(frx_texcoord);
        vec2 uv1, uv2, uv3, uv4;
        vec2 sampleOffset = vec2(1.0 / 16.0, 0.0);

        uv1 = uv + sampleOffset.xy;
        uv2 = uv - sampleOffset.xy;
        uv3 = uv + sampleOffset.yx;
        uv4 = uv - sampleOffset.yx;


        float height1 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv1))).rgb);
        float height2 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv2))).rgb);
        float height3 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv3))).rgb);
        float height4 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(fract(uv4))).rgb);

        float deltaX = (height2 - height1) * 1.0;
        float deltaY = (height4 - height3) * 1.0;

        frx_fragNormal = fmn_fNormalize(vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY)));
    #endif
}
