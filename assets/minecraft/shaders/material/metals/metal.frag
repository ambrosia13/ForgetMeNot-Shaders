#include forgetmenot:shaders/lib/materials.glsl

void frx_materialFragment() {
    #ifdef PBR_ENABLED
        frx_fragReflectance = 1.0;
        frx_fragRoughness = 0.31;

        vec2 uv = frx_normalizeMappedUV(frx_texcoord);
        vec2 uv1, uv2, uv3, uv4;
        vec2 offset = vec2(1.0 / 16.0, 0.0);

        uv1 = uv + offset.xy;
        uv2 = uv - offset.xy;
        uv3 = uv + offset.yx;
        uv4 = uv - offset.yx;

        if(
            clamp(uv1, 0.0, 1.0) == uv1 &&
            clamp(uv2, 0.0, 1.0) == uv2 && 
            clamp(uv3, 0.0, 1.0) == uv3 &&
            clamp(uv4, 0.0, 1.0) == uv4  
        ) {
            float height1 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(uv1)).rgb);
            float height2 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(uv2)).rgb);
            float height3 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(uv3)).rgb);
            float height4 = frx_luminance(texture(frxs_baseColor, frx_mapNormalizedUV(uv4)).rgb);

            float deltaX = (height2 - height1) * 1.0;
            float deltaY = (height4 - height3) * 1.0;

            frx_fragNormal = normalize(vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY)));
        }
    #endif
}
