#include forgetmenot:shaders/lib/includes.glsl

float waterHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = frx_renderSeconds / 50.0;

    vec2 coord = uv * 0.3;

    waterHeight += fbm2D(coord * vec2(2.0, 1.0) + vec2(1.2, 0.7) * time);
    waterHeight += fbm2D(coord * vec2(3.1, 1.2) - vec2(0.8, 1.2) * time);
    waterHeight += fbm2D(coord * vec2(3.5, 2.3) + vec2(1.5, 0.4) * time);
    waterHeight += fbm2D(coord * vec2(2.4, 4.1) - vec2(1.2, 0.3) * time);

    waterHeight *= 1.0;

    if(frx_playerEyeInWater == 0 && frx_playerWet == 1) waterHeight += sin(frx_distance * 3.0 - frx_renderSeconds * 7.0) * frx_smootherstep(10.0, 0.0, frx_distance);

    return pow(waterHeight, 2.0) * 0.15;
}

void frx_materialFragment() {
    vec2 uv0 = frx_var0.xy;
    vec2 uv = vec2(
        uv0.x + (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0),
        uv0.y - (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0)
    ) * 0.05;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #ifdef PBR_ENABLED
        float offset = 0.02;

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