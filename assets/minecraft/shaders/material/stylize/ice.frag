#include forgetmenot:shaders/lib/includes.glsl

void frx_materialFragment() {
    vec2 uv = floor(frx_var0.xy * 16.0) / 16.0;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #if defined PBR_ENABLED && defined ICE_NORMALS
        float offset = 0.015;

        float height1 = iceHeightNoise(uv + vec2(offset, 0.0));
        float height2 = iceHeightNoise(uv - vec2(offset, 0.0));
        float height3 = iceHeightNoise(uv + vec2(0.0, offset));
        float height4 = iceHeightNoise(uv - vec2(0.0, offset));

        float deltaX = (height2 - height1);
        float deltaY = (height4 - height3);

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        frx_fragNormal = normalize(frx_fragNormal);

        frx_fragReflectance = 0.06;
    #endif

    // frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    // frx_fragColor.a *= 0.5;
}