#include forgetmenot:shaders/lib/materials.glsl
#include lumi:shaders/api/pbr_ext.glsl

#ifndef WAVES_QUALITY
    #define WAVES_QUALITY 3
#endif

float waterHeightNoise(in vec2 uv) {
    float waterHeight;
    float waves;
    float w;
    float time = frx_renderSeconds / 700.0;

    vec2 coord = uv * vec2(1.0, 0.7);

    float noise = fmn_fbm2D(coord, 3, 1.0) * (4.0 / 3.0);
    //noise = max(noise, fmn_fbm2D(coord - 100.0, 3, -1.0));
    noise += (fmn_fbm2D(coord * vec2(8.0, 1.5), 2, 2.0) * 2.0 - 1.0) * 0.05;

    return pow(noise * 0.5, 1.5) * mix(0.0, 0.5, dot(frx_vertexNormal.xyz, fmn_fNormalize(frx_vertex.xyz)));

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

// vec2 waterParallax(in vec2 uv) {
//     vec2 parallaxUv = fmn_parallaxMapping(uv, waterHeightNoise(uv));
//     return mix(uv, parallaxUv, )
// }

void frx_materialFragment() {
    mat3 tbn = mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );

    vec2 uv0 = frx_var0.xy;
    vec2 uv = uv0 * 0.8;
    
    float centerNoise = waterHeightNoise(uv);
    uv = fmn_parallaxMapping(uv, centerNoise * 4.0);

    centerNoise = waterHeightNoise(uv);

    #ifdef PBR_ENABLED
        #ifndef SIMPLE_WATER
            float offset = 1e-2;
            float wavesStrength = mix(0.05, 0.75, frx_fragLight.y);
            //centerNoise *= wavesStrength;

            float height1 = waterHeightNoise(uv + vec2(offset, 0.0));
            //float height2 = waterHeightNoise(uv - vec2(offset, 0.0));
            float height3 = waterHeightNoise(uv + vec2(0.0, offset));
            //float height4 = waterHeightNoise(uv - vec2(0.0, offset));

            float deltaX = ((-centerNoise + height1) / (offset * 0.5)) * wavesStrength;
            float deltaY = ((-centerNoise + height3) / (offset * 0.5)) * wavesStrength;

            frx_fragNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
            
            frx_fragNormal = fmn_fNormalize(frx_fragNormal);
        #else
            float height = waterHeightNoise(uv);
            frx_fragNormal = fmn_fNormalize(cross(dFdx(frx_vertex.xyz - vec3(0.0, height, 0.0)), dFdy(frx_vertex.xyz - vec3(0.0, height, 0.0)))) * tbn;
                            
        #endif

        frx_fragReflectance = 0.05;
        frx_fragRoughness = 0.01;
    #endif

    fmn_isWater = 1;
    fmn_sssAmount = 1.0;

    #if LUMI_PBR_API >= 8
        //pbr_f0 = 0.05;
        //pbr_roughness = 0.01;
        //pbr_isWater = true;
        pbr_builtinWater = true;
    #endif

    #ifdef INTERNAL_MATERIALS
        frx_fragColor = vec4(vec3(0.0, 0.20, 0.25), 0.5);
    #else 

    #endif
    //frx_fragColor = frx_vertexColor * vec4(0.2, 0.9, 1.0, 1.0);
    // frx_fragColor.a *= 0.75;
}