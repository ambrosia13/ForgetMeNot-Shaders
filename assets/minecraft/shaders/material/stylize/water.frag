#include forgetmenot:shaders/lib/includes.glsl

float waterHeightNoise(in vec2 uv) {
    float waterHeight;

    float noiseA = cellular(uv + frx_renderSeconds * 0.3).x;
    float noiseB = cellular(uv - frx_renderSeconds * 0.3).x;

    waterHeight = mix(noiseA, noiseB, 0.5);

    if(frx_playerEyeInWater == 0 && frx_playerWet == 1) waterHeight += sin(frx_distance * 3.0 - frx_renderSeconds * 7.0) * frx_smootherstep(10.0, 0.0, frx_distance);

    return pow(waterHeight, 2.0) * 0.15;
}

void frx_materialFragment() {
    vec2 uv0 = frx_var0.xy;
    vec2 uv = vec2(
        uv0.x + (sin(frx_renderSeconds / 1.0) / 20 + frx_renderSeconds / 1.0),
        uv0.y - (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0)
    ) * 0.1;

    //frx_fragNormal += cellular(uv).x * 0.1;

    #ifdef PBR_ENABLED
        float height1 = waterHeightNoise(uv);
        float height2 = waterHeightNoise(uv * 2.0);
        float height3 = waterHeightNoise(uv * 3.0);
        float height4 = waterHeightNoise(uv * 4.0);

        float deltaX = (height2 - height1);
        float deltaY = (height4 - height3);

        frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));

        frx_fragReflectance = 0.05;
    #endif

    //frx_fragColor = vec4(0.0, 0.0, 0.0, 0.5);
    frx_fragColor.a *= 0.5;
}