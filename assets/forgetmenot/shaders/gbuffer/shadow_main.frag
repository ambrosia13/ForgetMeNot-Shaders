#include forgetmenot:shaders/lib/includes.glsl 
#define SHADOW_MAP_SIZE 2048
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;
uniform sampler2DArray u_shadow_color;

in vec4 shadowViewPos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 pbrData;
layout(location = 3) out vec4 vertexNormal;

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
vec2 parallaxMapping(in vec2 texcoord, in float height) {
    vec3 viewDir = normalize(frx_vertex.xyz) * mat3(frx_vertexTangent.xyz, cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), frx_vertexNormal.xyz);
    vec2 p = viewDir.xy / viewDir.z * (height * 1.0);
    return texcoord - p;
}

mat3 tbnMatrix() {
    return mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );
}
void resolveNormals() {
    mat3 tbn = tbnMatrix();

    frx_fragNormal = tbn * frx_fragNormal;
    if(frx_isHand) {
        frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
    }
}

void frx_pipelineFragment() {
    bool isInventory = frx_isGui && !frx_isHand;
    vec3 gamma = vec3(isInventory ? 1.0 : 2.2);
    vec3 tdata = getTimeOfDayFactors();

    #ifdef WHITE_WORLD
        frx_fragColor.rgb = vec3(1.0);
    #endif

    frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
    vec4 color = frx_fragColor;

    resolveNormals();
    float VNdotL = dot(frx_vertexNormal, frx_skyLightVector);
    float NdotL = dot(frx_fragNormal, frx_skyLightVector);
    NdotL = mix(NdotL, 1.0, frx_matDisableDiffuse);

    // Rain ripples
    vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);
    uv = parallaxMapping(uv, rainHeightNoise(uv) * 4.0);

    if(frx_smoothedRainGradient > 0.0) {
        vec3 noise = (vec3(rainHeightNoise(uv), rainHeightNoise(uv + 100.0), rainHeightNoise(uv - 100.0)));
        frx_fragNormal += mix(vec3(0.0), noise * (2.0 * length(noise)) - length(noise), frx_smoothedRainGradient * step(0.9, frx_vertexNormal.y));
        frx_fragNormal = normalize(frx_fragNormal);
    }
    if(frx_fragReflectance == 0.04) {
        frx_fragReflectance = 0.0;
        if(frx_vertexNormal.y > 0.9) frx_fragReflectance = mix(0.0, 0.04, frx_smoothedRainGradient * smoothstep(0.5, 0.7, frx_fragLight.y));
    }

    // // Fake roughness
    // if(frx_fragRoughness == 1.0) frx_fragRoughness = 0.0;
    // frx_fragNormal += normalize(rand3D(10.0 * gl_FragCoord.xy + 2.0 * mod(frx_renderSeconds, 1000.0))) * (frx_fragRoughness / 10.0);
    // frx_fragNormal = normalize(frx_fragNormal);


    // Makes shadows pixel aligned
    // vec4 viewPos = frx_shadowViewMatrix * vec4((floor((frx_vertex.xyz + frx_cameraPos) * 16.0) / 16.0) - frx_cameraPos, frx_vertex.w);
    int cascade = selectShadowCascade(shadowViewPos);
    vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
    vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

    float shadowMap;
    vec3 shadowBlurColor;

    float penumbraSize = 2.0;
    float dither = sqrt(interleaved_gradient());

    // Blocker search, adjusts penumbraSize accordingly
    #ifdef VARIABLE_PENUMBRA_SHADOWS
        float blockerCount;
        float blockers;

        for(int i = 0; i < VPS_SEARCH_SAMPLES; i++) {
            vec2 offset = diskSampling(i, VPS_SEARCH_SAMPLES, dither * TAU) * (10.0 * cascade);
            vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;

            float depthQuery = texture(frxs_shadowMapTexture, vec3(sampleCoord, cascade)).r;
            float diff = max(0.0, shadowScreenPos.z - depthQuery) * 1000.0;

            blockers += diff;
            blockerCount += 1.0;
        }
        blockers /= blockerCount;

        penumbraSize = blockers;
        penumbraSize = min(penumbraSize, 20.0 * (cascade));
        penumbraSize = max(penumbraSize, 1.0);

        // SSS approximation, blur backface shadows
        penumbraSize = mix(penumbraSize, 8.0 * cascade, fmn_sssAmount * step(0.0, -VNdotL));
    #endif

    vec3 shadowPosDX = dFdx(shadowScreenPos);
    vec3 shadowPosDY = dFdy(shadowScreenPos);

    vec2 receiverPlaneDepthBias = computeReceiverPlaneDepthBias(shadowPosDX, shadowPosDY);

    float fractionalSamplingError = 2.0 * dot(vec2(1.0 / SHADOW_MAP_SIZE), abs(receiverPlaneDepthBias));
    float cutoutBias = 0.00005 + 0.00005 * (1.0 - frx_skyLightVector.y) + 0.00005 * clamp01(1.0 - VNdotL) + 0.00009 * (3 - cascade);
    
    #ifdef BIAS_MULT
        float biasMult = 1.0 + 0.1 * max(0, 2 - cascade);
    #else
        float biasMult = 1.0;
    #endif

    shadowScreenPos.z -= biasMult * mix(min(fractionalSamplingError, 0.01), cutoutBias, frx_matCutout);

    for(int i = 0; i < SHADOW_FILTER_SAMPLES; i++) {
        vec2 offset = diskSampling(i, SHADOW_FILTER_SAMPLES, dither * TAU) * penumbraSize;
        vec2 sampleCoord = shadowScreenPos.xy + offset / SHADOW_MAP_SIZE;
        shadowMap += texture(frxs_shadowMap, vec4(sampleCoord, cascade, shadowScreenPos.z)) / SHADOW_FILTER_SAMPLES;
    }

    shadowMap = clamp01(shadowMap);
    shadowMap *= mix(smoothstep(-0.0, 0.1, VNdotL), 1.0, fmn_sssAmount); // skip NdotL shading to approximate SSS

    // backface brightening - apparently happens in real life with SSS
    //shadowMap *= mix(1.0, 3.3, fmn_sssAmount * step(0.0, -VNdotL) * (1.0 - frx_matDisableDiffuse));

    shadowMap = mix(shadowMap, 0.0, tdata.z);
    shadowMap *= frx_worldIsOverworld;
    float shadowMapInverse = 1.0 - clamp01(shadowMap);

    if(!isInventory) {
        vec3 lightmap = vec3(1.0);

        #ifndef VANILLA_AO
            frx_fragLight.z = 1.0;
        #endif

        if(frx_worldIsEnd + frx_worldIsNether + frx_worldIsOverworld >= 1) {
            frx_fragLight.y = mix(frx_fragLight.y, 1.0, frx_worldIsEnd);

            frx_fragLight.xy *= mix(1.0, frx_darknessEffectFactor * 0.95 + 0.05, frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));            
            frx_fragLight.z = mix(frx_fragLight.z, 1.0, clamp01(shadowMap + frx_matDisableAo));


            float directionalShadingFactor = NdotL * 0.5 + 0.5;

            vec3 blockLightColor = mix(vec3(1.0, 0.49, 0.16), vec3(1.0), BLOCKLIGHT_NEUTRALITY) * 2.0;

            float blocklight = smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.x) * 16.0;
            float skylight = smoothstep(1.0 / 16.0, 15.0 / 16.0, frx_fragLight.y) * 16.0;

            lightmap = vec3(0.0);

            vec3 aboveGroundLighting;

            vec3 skyLightColor = getSkyColor(frx_skyLightVector);
            vec3 ambientLightColor = getFogScattering(vec3(0.0, 1.0, 0.0), 100000.0);
            
            if(frx_worldIsEnd == 1) {
                // Never thought I'd ever name a variable NdotPlanet
                float NdotPlanet = dot(frx_fragNormal, normalize(vec3(0.8, 0.3, -0.5)));
                ambientLightColor = mix(ambientLightColor, vec3(0.0, 0.3, 0.15), smoothstep(0.5, 1.0, NdotPlanet));
                ambientLightColor = mix(ambientLightColor, vec3(0.5, 0.05, 0.35), smoothstep(0.5, 1.0, 1.0 - NdotPlanet));
            }

            float skyIlluminance = frx_luminance(ambientLightColor) * mix(1.0, 1.5, clamp01(frx_skyLightVector.y));

            #ifdef AMBIENT_LIGHT_BOOST
                skyIlluminance *= 1.33;
                ambientLightColor = normalize(ambientLightColor) * 0.75 + 0.25;
                aboveGroundLighting += max(0.075, skyIlluminance) * ambientLightColor * shadowMapInverse;
            #else
                ambientLightColor = normalize(ambientLightColor);
                aboveGroundLighting += skyIlluminance * ambientLightColor * shadowMapInverse;
            #endif

            skyLightColor = normalize(skyLightColor) * 6.5;
            aboveGroundLighting += min(vec3(3.0), skyIlluminance * skyLightColor * shadowMap * directionalShadingFactor);

            aboveGroundLighting = mix(aboveGroundLighting, max(blockLightColor, aboveGroundLighting), smoothstep(0.0, 16.0, blocklight));

            lightmap = mix(lightmap, aboveGroundLighting, frx_fragLight.y);

            vec3 undergroundLighting = vec3(0.005);
            undergroundLighting = mix(undergroundLighting, max(blockLightColor, undergroundLighting), smoothstep(0.0, 16.0, blocklight));
            undergroundLighting += min(vec3(3.0), skyIlluminance * skyLightColor * shadowMap * directionalShadingFactor);

            lightmap = mix(undergroundLighting, lightmap, frx_fragLight.y);

            if(frx_worldIsNether == 1) {
                lightmap = vec3(0.1, 0.05, 0.0);
                lightmap += vec3(1.0, 0.25, 0.0) * (smoothstep(-0.5, 0.5, -frx_fragNormal.y) + 2.0 * pow(frx_fragLight.x, 2.0) + 0.3);
            }

            // handheld light
            float heldLightFactor = frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, frx_vertex.xyz + frx_cameraPos));
            heldLightFactor *= mix(clamp01(dot(-frx_fragNormal, normalize((frx_vertex.xyz + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))), 1.0, frx_smootherstep(1.0, 0.0, distance(frx_eyePos + vec3(0.0, 1.0, 0.0), frx_vertex.xyz + frx_cameraPos))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
            if(frx_isHand && !all(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
            heldLightFactor = clamp01(heldLightFactor);
            lightmap = mix(lightmap, (max(pow(frx_heldLight.rgb * 1.2, vec3(2.2)), lightmap)), heldLightFactor);

            //lightmap = pow(lightmap, vec3(1.0 / (0.5 + frx_viewBrightness)));

            lightmap = mix(lightmap, lightmap * 0.75 + 0.25, frx_worldIsEnd);

            if(frx_effectNightVision == 1) lightmap = mix(lightmap, lightmap * 0.5 + 0.5, frx_effectModifier);

            lightmap = max(vec3(0.0005), lightmap);

            if(frx_fragReflectance < 1.0 || frx_isGui) color.rgb *= pow(lightmap, vec3(1.0)) * pow(frx_fragLight.z, 1.5);
        } else {
            lightmap = pow(texture(frxs_lightmap, frx_fragLight.xy).rgb, vec3(2.2)) * pow(frx_fragLight.z, 1.5);

            //color.rgb *= lightmap;
        }

        // Material info stuff
        color.rgb = mix(color.rgb, frx_fragColor.rgb, frx_fragEmissive * mix((1.0), (frx_darknessEffectFactor), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0))));
        
        float emissionFactor = frx_luminance(color.rgb + 4.0 * color.rgb * pow(1.0 + frx_fragEmissive, 2.0));
        color.rgb += color.rgb * 10.0 * frx_fragEmissive;
        //color.rgb = mix(vec3(frx_luminance(color.rgb)), color.rgb, 1.0 + 0.5 * frx_fragEmissive);

        color.rgb = mix(color.rgb, vec3(frx_luminance(lightmap), 0.0, 0.0), 0.5 * frx_matHurt); 
        color.rgb = mix(color.rgb, vec3(2.0), 0.5 * frx_matFlash); 
    } else {
        vec3 direction = vec3(0.2, 0.8, 0.6);
        float lengthSquared = dot(direction, direction);
        direction /= lengthSquared * inversesqrt(lengthSquared);
        color.rgb *= dot(frx_vertexNormal, direction) * 0.35 + 0.65;
    }

    if(frx_matGlint == 1) {
        vec3 glint = texture(u_glint, frx_normalizeMappedUV(frx_texcoord * 0.2 + frx_renderSeconds / 500.0)).rgb;
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    if(color.a < 0.05 && frx_renderTargetSolid && !frx_isGui) discard;

    //color.rgb = shadowBlurColor;

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    vertexNormal = vec4(frx_vertexNormal * 0.5 + 0.5, 1.0);
    pbrData = vec4(frx_fragReflectance, fmn_isWater, frx_fragRoughness, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}