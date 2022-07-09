float iceHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = 1.0;

    vec2 coord = uv * 1.5;

    waterHeight += fbmHash(coord, 2, 0.0) * (3.0 / 2.0) * 0.5 + 0.5;

    waterHeight *= 2.0;
    waterHeight += 0.3;

    return pow(waterHeight, 4.0) * 0.15;
}

// unfinished
float rainHeightNoise(in vec2 uv) {
    float size = 0.2;
    float noise = smoothstep(0.5, 0.7, 1.0 - cellular2x2(uv * 10.0).x);
    noise = fract(noise + (frx_renderSeconds));
    float r = (smoothstep(sin(0.2 + frx_renderSeconds), sin(0.4 + frx_renderSeconds), noise) - smoothstep(sin(0.6 + frx_renderSeconds), sin(0.4 + frx_renderSeconds), noise)) * 0.15;
    r = smoothstep(0.2, 0.4, noise) - smoothstep(0.4, 0.6, noise);
    return r * 0.15;
}
