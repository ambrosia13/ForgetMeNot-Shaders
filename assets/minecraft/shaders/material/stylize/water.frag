#include forgetmenot:shaders/lib/materials.glsl
#include lumi:shaders/api/pbr_ext.glsl

#ifndef WAVES_QUALITY
    #define WAVES_QUALITY 3
#endif

// https://iquilezles.org/articles/smin/
// polynomial smooth min
float smaxCubic( float a, float b, float k )
{
    float h = max( k-abs(a-b), 0.0 )/k;
    return max( a, b ) - h*h*h*k*(1.0/6.0);
}

float waterHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = frx_renderSeconds / 700.0;

    vec2 coord = uv * vec2(1.0, 0.7);

    float noise = fmn_fbm2D(coord, 3, 1.0) * (3.0 / 2.0);
    //noise = max(noise, fmn_fbm2D(coord - 100.0, 3, -1.0));
    noise += (fmn_fbm2D(coord * vec2(8.0, 1.5), 3, -1.0) * 2.0 - 1.0) * 0.025;

    return pow(noise * 0.5, 1.5) * (0.15);

    // float amp = 0.5;
    // float offset = 1.0;
    // float noise;

    // mat2 rotationMatrix = mat2(cos(PI / 16.0), sin(PI / 16.0), -sin(PI / 16.0), cos(PI / 16.0));
    
    // // for(int i = 0; i < 10; i++) {
    // //     // // noise += amp * exp2(sin(uv.x + uv.y) * sin((uv.x + 2.0 * uv.y) * 0.5) - 1.0);
    // //     // // uv = 1.0 * (uv) + mod(frx_renderSeconds * 0.1, 1000.0);
    // //     // // uv *= 2.0;
    // //     // // amp *= 0.5;
    // //     // // uv += offset * 0.5 * i;
    // //     // float n = sin(dot(uv.xy, fmn_hash2D(float(i)) * 2.0 - 1.0));
    // //     // noise += amp * exp(n);

    // //     // uv = rotationMatrix * uv * 2.0;
    // //     // amp *= 0.5;
    // //     // uv += offset * i;
    // //     uv = rotationMatrix * uv;
    // //     noise += amp * sin(uv.x);
    // //     amp *= 0.5;
    // // }
    // for(int i = 0; i < 20; i++) {
    //     uv = fmn_rotate2D(uv, fmn_hash1D(i));
    //     noise += amp * pow(sin(uv.x), 2.0);
    //     uv *= 2.0;
    //     uv += frx_renderSeconds * amp * 4.0;
    //     amp *= 0.5;
    // }

    // return noise * 0.05;
}

void frx_materialFragment() {
    vec2 uv0 = frx_var0.xy;
    vec2 uv = uv0 * 0.8;
    // vec2(
    //     uv0.x + (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0),
    //     uv0.y - (sin(frx_renderSeconds / 1.0) / 2.0 + frx_renderSeconds / 1.0)
    // ) * 0.3;

    //uv = floor(uv * 116.0) / 116.0;
    
    float centerNoise = waterHeightNoise(uv);
    uv = fmn_parallaxMapping(uv, centerNoise * 4.0);

    centerNoise = waterHeightNoise(uv);

    #ifdef PBR_ENABLED
        #ifndef SIMPLE_WATER
            float offset = 1e-2;

            float height1 = waterHeightNoise(uv + vec2(offset, 0.0));
            // float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
            float height3 = waterHeightNoise(uv + vec2(0.0, offset));
            // float height4 = waterHeightNoise(uv - vec2(0.0, offset));

            float deltaX = (centerNoise - height1) * 50.0;
            float deltaY = (centerNoise - height3) * 50.0;

            frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
            
            //frx_fragNormal = clamp(frx_fragNormal, vec3(-1.0), vec3(1.0));
            frx_fragNormal = normalize(frx_fragNormal);
        #else
            float height = waterHeightNoise(uv);
            frx_fragNormal = normalize(cross(dFdx(frx_vertex.xyz - vec3(0.0, height, 0.0)), dFdy(frx_vertex.xyz - vec3(0.0, height, 0.0))))
                            *mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
        #endif

        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.0;
    #endif

    fmn_isWater = 1;

    #if LUMI_PBR_API >= 8
        pbr_f0 = 0.05;
        pbr_roughness = 0.01;
        pbr_isWater = true;
        //pbr_builtinWater = true;
    #endif

    #ifdef INTERNAL_MATERIALS
        frx_fragColor = vec4(0.0, 0.16, 0.09, 0.5);
        frx_fragColor.rgb *= vec3(1.0, 1.3, 0.7);
    #endif
    //frx_fragColor = frx_vertexColor * vec4(0.2, 0.9, 1.0, 1.0);
    // frx_fragColor.a *= 0.75;
}