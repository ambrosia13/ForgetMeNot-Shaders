#include forgetmenot:shaders/lib/includes.glsl

void frx_materialFragment() {
    #define VANILLA_LAVA
    #ifndef VANILLA_LAVA
        vec2 normalizedUV = floor(frx_var0.xy * 16.0) / 8.0;

        vec3 lavaColor = vec3(0.420,0.025,0.005);
        vec2 uv = vec2(
            normalizedUV.x + (sin(frx_renderSeconds / 10.0) / 20 + frx_renderSeconds / 15.0),
            normalizedUV.y + (sin(frx_renderSeconds / 5.0) / 2.0 + frx_renderSeconds / 10.0)
        ) + frx_renderSeconds *
        mix(vec2(0.5), ((frx_vertexNormal.y - 1.0) > 0.01 ? (-normalize(frx_vertexNormal.xz) + mix(vec2(0.0, 0.5), vec2(0.0, 1.0), 1.0 - abs(frx_vertexNormal.y))) : vec2(0.0)), 1.0);

        float distortX = sin(normalizedUV.y * 1.0 + frx_renderSeconds * 0.25) * 0.2;
        float distortY = cos(normalizedUV.x * 1.0 + frx_renderSeconds * 0.25) * 0.2;
        vec2 distort = vec2(distortX * cos(frx_renderSeconds * 0.25), distortY * sin(frx_renderSeconds * 0.25));

        float lavaNoise = fbmHash(uv.xy * 1.0 + distort / 2.0, 6) * 2.0;
        lavaNoise *= fbm2D(uv.yx * 0.5 - distort) * 2.0;
        lavaNoise *= fbm2D(uv.xy * 0.1 + distort) * 2.0;
        // (0.0) (1.5, 0.1, 0.0) (4.0, 0.3, 0.0)
        vec3 lava = mix(vec3(0.0), vec3(2.5, 0.1, 0.0), frx_smootherstep(0.5, 2.0, lavaNoise));
        lava = mix(lava, vec3(5.0, 0.5, 0.0), frx_smootherstep(1.0, 4.0, lavaNoise));

        // float magma = snoise((uv.xy + distort) * 0.25);
        // float magma1 = snoise((uv.yx + distort * 1.3) * 0.5);
        // float magma2 = snoise((uv.xy + distort * 1.5) * 1.0);
        // float magma3 = snoise((uv.yx + distort * 1.7) * 1.5);
        // float magma4 = snoise((uv.xy + distort * 1.1) * 2.0);
        // float magma5 = snoise((uv.yx + distort * 0.9) * 2.5);

        // // lower detail lava based on distance
        // // magma5 *= 1.0 - frx_smootherstep(25, 35, frx_distance);
        // // magma4 *= 1.0 - frx_smootherstep(45, 55, frx_distance);
        // // magma3 *= 1.0 - frx_smootherstep(70, 80, frx_distance);
        // // magma2 *= 1.0 - frx_smootherstep(100, 110, frx_distance);
        // // magma1 *= 1.0 - frx_smootherstep(135, 145, frx_distance);
        
        // vec3 lava = lavaColor + vec3(
        //     (magma + magma1 + magma2 + magma3 + magma4 + magma5) / 1.0
        //     * vec3(0.995,0.315,0.084)
        //     );

        // vec2 worldUV = frx_var0.xy;
        // worldUV = floor(worldUV * 16.0) / 16.0;
        // vec3 lavaCol = vec3(1.000,0.125,0.005);
        // lavaCol += fbm2D(worldUV) * (fbm2D(worldUV * 0.25 + 10.0));
        // lavaCol = mix(lavaCol, vec3(0.0), frx_luminance(lavaCol));
        // lavaCol *= lavaCol * frx_luminance(lavaCol);

        frx_fragColor.rgb = max(lava * 0.75, vec3(0.0));
        // frx_fragColor.rgb *= 3.0 * frx_luminance(frx_fragColor.rgb);
    #else
        frx_fragColor.rgb *= 1.5;
    #endif 

    frx_fragEmissive = frx_luminance(frx_fragColor.rgb) * 0.5;
    //frx_fragEmissive = 1.0;
    frx_fragEnableDiffuse = false;
    frx_fragEnableAo = false;
}