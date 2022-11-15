#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_glint;

in vec4 shadowViewPos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 tangentNormal;
layout(location = 3) out vec4 pbrData;
layout(location = 4) out vec4 depthNoPlayer;
layout(location = 5) out vec4 materialData;
layout(location = 6) out vec4 lightData;
layout(location = 7) out vec4 solidNormal;

// procedural rain noise
float rainHeightNoise(in vec2 uv) {
    float time = frx_renderSeconds * 8.0;
    uv += floor(time) * 0.2 * rand2D(vec2(floor(time)));
    time = mix(fract(time), 0.0, smoothstep(0.8, 0.9, fract(time))) * 0.2;

    //uv += frx_renderSeconds;

    float noise = 1.0 - cellular2x2(uv * 6.0).x;
    float n = noise;

    noise = smoothstep(0.8 - time, 0.84, noise);
    noise += smoothstep(0.6 - time, 0.8 - time, n) * 0.1; 

    return noise * 0.01;
}

mat3 tbnMatrix() {
    return mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );
}
void resolveMaterials() {
    mat3 tbn = tbnMatrix();

    frx_fragNormal = tbn * frx_fragNormal;
    if(frx_isHand) {
        frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
    }

    // No reflections on default materials
    frx_fragReflectance = mix(0.0, frx_fragReflectance, step(0.0001, frx_fragReflectance - 0.04));

    frx_fragRoughness = mix(frx_fragRoughness, 0.0, smoothstep(0.0, 0.5, fmn_rainFactor));

    // Hurt effect
    frx_fragColor.rgb = mix(frx_fragColor.rgb, vec3(1.0, 0.0, 0.0), 0.5 * frx_matHurt);

    // Glint
    if(frx_matGlint == 1) {
        vec3 glint = texture(u_glint, fract(frx_normalizeMappedUV(frx_texcoord) * 0.5 + frx_renderSeconds * 0.1)).rgb;
        glint = pow(glint, vec3(4.0));
        frx_fragColor.rgb += glint;
    }

    // white world - for debug
    #ifdef WHITE_WORLD
        frx_fragColor.rgb = vec3(1.0);
    #endif
}

void frx_pipelineFragment() {
    resolveMaterials();

    bool isInventory = frx_isGui && !frx_isHand;
    vec3 gamma = vec3(isInventory ? 1.0 : 2.2);
    vec3 tdata = getTimeOfDayFactors();

    frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
    vec4 color = frx_fragColor;

    float VNdotL = dot(frx_vertexNormal, frx_skyLightVector);
    float NdotL = dot(frx_fragNormal, frx_skyLightVector);
    NdotL = mix(NdotL, 1.0, frx_matDisableDiffuse);

    // // Rain ripples
    // if(frx_smoothedRainGradient > 0.0) {
    //     vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);

    //     vec3 noise = (vec3(rainHeightNoise(uv), rainHeightNoise(uv + 100.0), rainHeightNoise(uv - 100.0)));
    //     frx_fragNormal += mix(vec3(0.0), noise * (2.0 * length(noise)) - length(noise), frx_smoothedRainGradient * step(0.9, frx_vertexNormal.y));
    //     frx_fragNormal = fNormalize(frx_fragNormal);
    // }

    // Makes shadows pixel aligned
    // vec4 viewPos = frx_shadowViewMatrix * vec4((floor((frx_vertex.xyz + frx_cameraPos) * 16.0) / 16.0) - frx_cameraPos, frx_vertex.w);
    int cascade = selectShadowCascade(shadowViewPos);
    vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
    vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

    float shadowMap;
    float penumbraSize = 2.0;

    float cutoutBias = 0.00005 + 0.00005 * (1.0 - frx_skyLightVector.y) + 0.00005 * clamp01(1.0 - VNdotL) + 0.00009 * (3 - cascade);
    #ifdef BIAS_MULT
        float biasMult = 1.0 + 0.1 * max(0, 2 - cascade);
    #else
        float biasMult = 1.0;
    #endif
    shadowScreenPos.z -= biasMult * cutoutBias;

    // low quality shadows for translucents
    #define SHADOW_FILTER_SAMPLES 3
    for(int i = 0; i < SHADOW_FILTER_SAMPLES; i++) {
        vec2 offset = diskSampling(i, SHADOW_FILTER_SAMPLES, interleaved_gradient(i) * TAU) * penumbraSize;
        vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;
        shadowMap += texture(frxs_shadowMap, vec4(sampleCoord, cascade, shadowScreenPos.z)) / SHADOW_FILTER_SAMPLES;
    }

    shadowMap = clamp01(shadowMap);
    shadowMap *= mix(smoothstep(-0.0, 0.1, VNdotL), 1.0, fmn_sssAmount); // skip NdotL shading to approximate SSS

    #ifdef SKYLIGHT_LEAK_FIX
        shadowMap *= smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.y);
    #endif

    shadowMap = mix(shadowMap, 0.0, tdata.z);
    shadowMap *= frx_worldIsOverworld;
    float shadowMapInverse = 1.0 - clamp01(shadowMap);

    if(!isInventory) {
        vec3 lightmap = vec3(0.0);

        if(frx_worldIsEnd + frx_worldIsNether + frx_worldIsOverworld >= 1) {
            if(frx_renderTargetSolid && !frx_isHand) {
                lightmap = vec3(1.0);
            } else {
                vec3 ambientLightColor = vec3(0.0);
                ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;

                float skyIlluminance = frx_luminance(ambientLightColor * 6.0);

                float lambertFactor = NdotL * 0.5 + 0.5;

                vec3 upColor = getSkyColor(vec3(0.0, 1.0, 0.0), 0.0);
                vec3 ambientColor = mix(vec3(0.05), max(vec3(0.1), (2.0 + 1.0 * frx_fragNormal.y) * (upColor)), frx_fragLight.y);

                if(frx_worldIsEnd == 1) {
                    // Never thought I'd ever name a variable NdotPlanet
                    float NdotPlanet = dot(frx_fragNormal, fNormalize(vec3(0.8, 0.3, -0.5)));
                    ambientColor = mix(ambientColor, 2.0 * vec3(0.1, 0.2, 0.15), smoothstep(0.5, 1.0, NdotPlanet));
                    ambientColor = mix(ambientColor, 2.0 * vec3(0.5, 0.05, 0.85), smoothstep(0.0, 1.0, 1.0 - NdotPlanet));

                    ambientColor = ambientColor * 0.75 + 0.25;
                }

                float ao = frx_fragLight.z;
                vec3 ambientLight = ambientColor * ao * ao;

                float sunlightStrength = 0.0004 - 0.0003 * fmn_rainFactor;
                sunlightStrength *= 5.0;

                lightmap += ambientLight;
                lightmap += skyIlluminance * sunlightStrength * lambertFactor * (getSkyColor(frx_skyLightVector)) * shadowMap;

                lightmap = mixmax(lightmap.rgb, vec3(6.0, 3.0, 1.2) * ao, frx_fragLight.x * frx_fragLight.x);

                // handheld light
                float heldLightFactor = 1.0 / (1.0 + pow(distance(frx_eyePos + vec3(0.0, 1.0, 0.0), frx_vertex.xyz + frx_cameraPos), 2.0));//frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, maxSceneSpacePos + frx_cameraPos));
                heldLightFactor *= mix(clamp01(dot(-frx_fragNormal, fNormalize((frx_vertex.xyz + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), frx_vertex.xyz + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
                heldLightFactor *= frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, frx_vertex.xyz + frx_cameraPos));
                heldLightFactor *= frx_heldLight.a + 1.0;

                if(frx_isHand && frx_heldLight.rgb != vec3(1.0)) heldLightFactor = 0.0;
                if(frx_heldLight.rgb != vec3(1.0)) lightmap = mixmax(lightmap, (pow(frx_heldLight.rgb * (2.2 + frx_heldLight.a), vec3(2.2)) * ao), heldLightFactor);

                lightmap = mix(lightmap, (lightmap * 0.5 + 0.5) * ao, frx_effectNightVision * frx_effectModifier);
                lightmap = mix(lightmap, vec3(1.0), frx_fragEmissive);
                lightmap = mix(lightmap, vec3(1.0), step(0.99, frx_fragReflectance - float(frx_isHand)));
            }
        } else {
            lightmap = pow(texture(frxs_lightmap, frx_fragLight.xy).rgb, vec3(2.2)) * pow(frx_fragLight.z, 1.5);
        }

        color.rgb *= lightmap;

        // Material info stuff
        color.rgb = mix(color.rgb, frx_fragColor.rgb, frx_fragEmissive * mix((1.0), (frx_darknessEffectFactor), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0))));
        
        float emissionFactor = frx_luminance(color.rgb + 4.0 * color.rgb * pow(1.0 + frx_fragEmissive, 2.0));
        color.rgb += color.rgb * 10.0 * frx_fragEmissive;
        //color.rgb = mix(vec3(frx_luminance(color.rgb)), color.rgb, 1.0 + 0.5 * frx_fragEmissive);

        color.rgb = mix(color.rgb, vec3(2.0), 0.5 * frx_matFlash); 
    } else {
        vec3 direction = vec3(0.2, 0.8, 0.6);
        float lengthSquared = dot(direction, direction);
        direction *= inversesqrt(lengthSquared);
        color.rgb *= dot(frx_vertexNormal, direction) * 0.45 + 0.55;
    }

    if(color.a < 0.01 && frx_renderTargetSolid && !frx_isGui) discard;

    //color.rgb = shadowBlurColor;

    if(fmn_isPlayer == 0) {
        depthNoPlayer.r = gl_FragCoord.z;
    }

    //if(frx_fragLight.x <= 1.5 / 16.0) {color.r *= 2.0;color.gb *= 0.5;}

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    tangentNormal = vec4((frx_fragNormal * tbnMatrix()) * 0.5 + 0.5, 1.0);
    pbrData = vec4(frx_fragReflectance, fmn_isWater, frx_fragRoughness, 1.0);
    materialData = vec4(frx_fragEmissive, 1.0 - float(frx_fragEnableDiffuse), fmn_sssAmount, 1.0);
    lightData = vec4(smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.xy), mix(frx_fragLight.z, 1.0, frx_matDisableAo), 1.0);
    solidNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}