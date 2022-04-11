#include forgetmenot:shaders/lib/includes.glsl

void frx_materialFragment() {
    vec2 uv0 = frx_var0.xy;
    vec2 uv = vec2(
        uv0.x + (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0),
        uv0.y - (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0)
    ) * 0.3;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #ifdef PBR_ENABLED
        float offset = 0.015;

        float height1 = waterHeightNoise(uv + vec2(offset, 0.0));
        float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
        float height3 = waterHeightNoise(uv + vec2(0.0, offset));
        float height4 = waterHeightNoise(uv - vec2(0.0, offset));

        float deltaX = (height2 - height1);
        float deltaY = (height4 - height3);

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
        frx_fragNormal = normalize(frx_fragNormal);

        frx_fragReflectance = 0.05;
    #endif

    //frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    frx_fragColor.a *= 0.5;
}