#include forgetmenot:shaders/lib/includes.glsl 
#include forgetmenot:shadows

// Borrowing some canvas stuff for shadow sampling & depth bias
#define SHADOW_MAP_SIZE 1536
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;

in vec4 shadowViewSpacePos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 fragData;

void frx_pipelineFragment() {
    vec4 color = frx_fragColor;
    vec4 unshadedColor = color;

    // sample enchantment glint texture
    // For anyone wondering why I attempt to put space between when I read textures and when I actually use those, it's a micro-optimization
    // https://developer.nvidia.com/blog/the-peak-performance-analysis-method-for-optimizing-any-gpu-workload/#appendix2
    float pixelScale = frx_isGui ? 16.0 : 32.0; 
    #ifdef PIXEL_LOCKED_GLINT
        vec3 glint = texture(u_glint, (floor(frx_normalizeMappedUV(frx_texcoord) * pixelScale) / pixelScale) + frx_renderSeconds / 15.0).rgb;
    #else
        vec3 glint = texture(u_glint, (frx_normalizeMappedUV(frx_texcoord)) + frx_renderSeconds / 15.0).rgb;
    #endif

    mat3 tbn = mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );

    #ifdef PBR_ENABLED
        frx_fragNormal = tbn * frx_fragNormal;
        if(frx_isHand) {
            frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
        }
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    #ifdef VANILLA_LIGHTING
        #ifdef APPLY_MC_LIGHTMAP
            int cascade = selectShadowCascade(shadowViewSpacePos);
            vec4 shadowSpacePos = frx_shadowProjectionMatrix(cascade) * (shadowViewSpacePos);
            vec3 shadowScreenPos = (shadowSpacePos.xyz) * 0.5 + 0.5;

            #ifdef CASCADE_ADJUST
                // blur less depending on cascade, since far away shadows are already low res and hardware filtered
                // Not a good solution though
                int blurAmount = max(0, cascade - 1);
            #else
                int blurAmount = SHADOW_FILTER_TAPS;
            #endif

            #ifdef SHADOW_FILTER
                vec2 uv = shadowScreenPos.xy * SHADOW_MAP_SIZE;
                vec2 baseUv = floor(uv + 0.5) - vec2(0.5);
                vec2 st = uv + 0.5 - baseUv;
                baseUv /= SHADOW_MAP_SIZE;
                
                // Not going to use half-res derivatives, introduces too many artifacts without TAA
                // Uh, wait, I guess I am
                vec3 shadowPosDX = dFdx(shadowScreenPos);
                vec3 shadowPosDY = dFdy(shadowScreenPos);
                // shadowPosDX.xy = vec2(0.0);
                // shadowPosDY.xy = vec2(0.0);

                vec2 depthBias;

                // Derivative of shadowScreenPos.xy is just 1, since they are linear
                // Tried and failed to calculate partial derivative of shadowScreenPos.z
                // float near = 0.005;
                // float far = frx_viewDistance;
                // float shadowPosDZ = (-1.0) * ((near * far) / ((shadowScreenPos.z * shadowScreenPos.z) * (near - far)));

                if(frx_matCutout == 0 || true) {
                //     depthBias = computeReceiverPlaneDepthBias(vec3(0.0), vec3(0.0)) + 0.1 * (4 - cascade) + 1.0 * float(cascade == 0);
                // } else {
                    depthBias = computeReceiverPlaneDepthBias(shadowPosDX, shadowPosDY);
                } else {
                    depthBias += computeReceiverPlaneDepthBias(vec3(1.0), vec3(1.0)) + 0.1 * (3 - cascade != 0 ? 2 * (3 - cascade) : 1) * (1.0 - clamp01(dot(frx_vertexNormal, frx_skyLightVector)));
                }

                //vec2 depthBias = vec2(0.05);
                // Copied straight from canvas dev shadow bias
            	float fractionalSamplingError = 2.0 * dot(vec2(1.0, 1.0) / SHADOW_MAP_SIZE, abs(depthBias));// + 0.1 * max(0, 2 - cascade);
	            shadowScreenPos.z -= min(fractionalSamplingError, 0.01);

                float shadowMap = 0.0;
                if(blurAmount != 0) {
                    for(int i = -blurAmount; i < blurAmount; i++) {
                        for(int j = -blurAmount; j < blurAmount; j++) {
                            shadowMap += pcfSample(baseUv, st.x + float(i), st.y + float(j), vec2(1.0 / SHADOW_MAP_SIZE), cascade, shadowScreenPos.z, depthBias) / (blurAmount * blurAmount * 4.0);
                        }
                    }
                } else {
                    shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
                }
            #else
                float shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
            #endif

            if(frx_matDisableDiffuse == 0) shadowMap *= step(0.01, dot(frx_vertexNormal.xyz, frx_skyLightVector));

            #ifdef DEPRESSING_MODE
                if(frx_isHand) shadowMap = 1.0;
            #else
                if(frx_isHand) {
                    shadowMap = 0.0;
                    //shadowMap *= smoothstep(-0.01, 0.01, dot(frx_fragNormal.xyz, frx_skyLightVector));
                }
            #endif

            float shadowMapInverse = 1.0 - shadowMap;

            if(!frx_isGui || frx_isHand) {
                vec3 lightmap = vec3(1.0);
                vec3 tdata = getTimeOfDayFactors();

                // TODO: move these magic numbers to a common area, maybe make configurable
                vec3 ambientLightColorDay = vec3(1.0, 1.3, 1.4) * AMBIENT_LIGHT_INTENSITY_DAY;
                vec3 directLightColorDay = normalize(vec3(1.3, 1.2, 0.9)) * DIRECT_LIGHT_INTENSITY_DAY;

                vec3 ambientLightColorSunset = vec3(0.9, 0.8, 0.8);
                vec3 directLightColorSunset[2];//vec3(1.1, 1.0, 0.9), vec3(0.9, 1.0, 1.0);
                directLightColorSunset[0] = vec3(1.1, 1.0, 0.9);
                directLightColorSunset[1] = vec3(1.0, 1.0, 1.05);

                vec3 ambientLightColorNight = vec3(1.3, 1.5, 1.7) * AMBIENT_LIGHT_INTENSITY_NIGHT;
                vec3 directLightColorNight = normalize(vec3(0.9, 1.1, 1.2)) * DIRECT_LIGHT_INTENSITY_NIGHT;

                // vec3 ambientLightColorDay = atmosphericScatteringTop(vec3(0.0, 1.0, 0.0), getSunVector(), 1.0 - tdata.y, 3.0 * AMBIENT_LIGHT_INTENSITY_DAY, 50.0);
                // vec3 directLightColorDay = normalize(vec3(1.3, 1.2, 0.8)) * DIRECT_LIGHT_INTENSITY_DAY;

                // vec3 ambientLightColorSunset = vec3(0.9, 0.8, 0.8);
                // vec3 directLightColorSunset[2];//vec3(1.1, 1.0, 0.9), vec3(0.9, 1.0, 1.0);
                // directLightColorSunset[0] = vec3(1.1, 1.0, 0.9);
                // directLightColorSunset[1] = vec3(1.0, 1.0, 1.05);

                // vec3 ambientLightColorNight = atmosphericScatteringTop(vec3(0.0, 1.0, 0.0), getMoonVector(), tdata.y, 2.0, 3000.0);
                // vec3 directLightColorNight = normalize(vec3(0.9, 1.1, 1.2)) * DIRECT_LIGHT_INTENSITY_NIGHT;

                frx_fragLight.y *= mix(1.0, 0.7, (frx_smoothedRainGradient + frx_thunderGradient) / 2.0);
                #ifdef DEPRESSING_MODE
                    frx_fragLight.y *= 1.0;
                    directLightColorNight *= 3.0;
                #endif

                lightmap = texture(frxs_lightmap, clamp01(frx_fragLight.xy)).rgb;
                lightmap *= mix(vec3(1.0), vec3(1.5, 1.4, 1.2), clamp01((pow(frx_fragLight.x * 1.5, 3.0)) - 1.0) * clamp01(shadowMapInverse + (1.0 - tdata.x)));

                #ifdef DEPRESSING_MODE
                    //lightmap = lightmap * 0.2;
                #endif

                lightmap *= mix(1.0, 1.5, (1.0 - frx_fragLight.y) * frx_fragLight.x * frx_fragLight.x);
                #ifdef VANILLA_AO
                        if(frx_matDisableAo == 0) lightmap *= mix(frx_fragLight.z, frx_fragLight.z * 0.5 + 0.5, frx_fragLight.y);
                #endif

                // ambient lighting - for surfaces in shadow
                lightmap *= mix(vec3(1.0), ambientLightColorDay, shadowMapInverse * tdata.x * frx_fragLight.y);
                // direct lighting - for surfaces not in shadow
                if(frx_matDisableDiffuse == 0) lightmap += (shadowMap) * tdata.x * frx_fragLight.y * mix(0.1, 0.3, shadowMap) * dot(frx_fragNormal, getSunVector()) * directLightColorDay;
                lightmap *= mix(vec3(1.0), shadowMap * (directLightColorDay) * 0.5 + 0.5, tdata.x * frx_fragLight.y);

                // ambient lighting - applied to everything
                lightmap *= mix(vec3(1.0), ambientLightColorSunset, tdata.z * frx_fragLight.y);
                // direct lighting - using normal dot product method
                if(frx_matDisableDiffuse == 0) lightmap += tdata.z * frx_fragLight.y * 0.2 * dot(frx_fragNormal, getSunVector()) * directLightColorSunset[0];
                if(frx_matDisableDiffuse == 0) lightmap += tdata.z * frx_fragLight.y * 0.2 * dot(frx_fragNormal, getMoonVector()) * directLightColorSunset[1];

                // ambient lighting - for surfaces in shadow
                lightmap *= mix(vec3(1.0), ambientLightColorNight, tdata.y * frx_fragLight.y);
                // direct lighting - for surfaces not in shadow
                if(frx_matDisableDiffuse == 0) lightmap += (shadowMap) * tdata.y * frx_fragLight.y * 0.1 * dot(frx_fragNormal, getMoonVector()) * directLightColorNight;
                lightmap *= mix(vec3(1.0), (shadowMap * 0.5 + 0.5) * (directLightColorNight) * 0.5 + 0.5, tdata.y * frx_fragLight.y);

                if(frx_matDisableDiffuse == 0) lightmap += (1.0 - frx_fragLight.y) * 0.1 * dot(frx_fragNormal, vec3(0.2, 0.3, 0.4));

                // handheld light
                float heldLightFactor = frx_smootherstep(frx_heldLight.a * HELD_LIGHT_RADIUS, frx_heldLight.a * 0.0, frx_distance);
                float blockLightColorFactor = frx_smootherstep(frx_heldLight.a * (HELD_LIGHT_RADIUS + 7.0), frx_heldLight.a * 0.0, frx_distance);
                heldLightFactor *= dot(-frx_fragNormal, normalize(frx_vertex.xyz)); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
                if(frx_isHand && !any(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
                heldLightFactor = clamp01(heldLightFactor);
                lightmap = mix(lightmap, (max(frx_heldLight.rgb * 1.5, lightmap) * (frx_fragLight.z * 0.75 + 0.25)), heldLightFactor);
                //lightmap *= mix(vec3(1.0), frx_heldLight.rgb * 1.5, frx_fragLight.x * blockLightColorFactor);

                #ifdef DEPRESSING_MODE
                    lightmap = mix(lightmap * 0.5, vec3(frx_luminance(lightmap)) * 0.5, 0.5);
                #endif

                if(frx_fragReflectance < 1.0) color.rgb *= max(vec3(0.05), lightmap);
            }
        #endif
        if(frx_isGui && !frx_isHand) color.rgb *= dot(frx_vertexNormal, vec3(0.3, 1.0, 0.6)) * 0.3 + 0.7; // directional shading in inventory
    #endif
    
    // shadows when no lightmap
    #ifndef APPLY_MC_LIGHTMAP
        vec3 tdata = getTimeOfDayFactors();
        int cascade = selectShadowCascade(shadowViewSpacePos);
        vec4 shadowSpacePos = frx_shadowProjectionMatrix(cascade) * shadowViewSpacePos;
        vec3 shadowScreenPos = (shadowSpacePos.xyz) * 0.5 + 0.5;

        int blurAmount = 2;

        #ifndef SHADOW_FILTER
            vec2 uv = shadowScreenPos.xy * SHADOW_MAP_SIZE;
            vec2 baseUv = floor(uv + 0.5) - vec2(0.5);
            vec2 st = uv + 0.5 - baseUv;
            baseUv /= SHADOW_MAP_SIZE;
            vec2 depthBias = vec2(0.05);//computeReceiverPlaneDepthBias(dFdx(shadowScreenPos), dFdy(shadowScreenPos));
            float fractionalSamplingError = 2.0 * dot(vec2(1.0, 1.0) / SHADOW_MAP_SIZE, abs(depthBias));
            shadowScreenPos.z -= min(fractionalSamplingError, 0.01);
            float shadowMap = 0.0;
            for(int i = -blurAmount; i < blurAmount; i++) {
                for(int j = -blurAmount; j < blurAmount; j++) {
                    shadowMap += pcfSample(baseUv, st.x + float(i), st.y + float(j), vec2(1.0 / SHADOW_MAP_SIZE), cascade, shadowScreenPos.z, depthBias) / (blurAmount * blurAmount * 4.0);
                    //shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + (vec2(i, j) / SHADOW_MAP_SIZE) * shadowVariance, cascade, shadowScreenPos.z)) / (blurAmount * blurAmount * 4.0);
                }
            }
            // shadowMap = shadowFilter(frxs_shadowMap, shadowScreenPos, cascade, 4.0);
            //float shadowMap = sampleShadowPCF(shadowScreenPos.xyz, cascade);
        #else
            float shadowMap = texture(frxs_shadowMap, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));
        #endif
        shadowMap *= step(0.01, dot(frx_vertexNormal, frx_skyLightVector));
        color.rgb += color.rgb * shadowMap * tdata.x;// * sampleSkyReflection(frx_skyLightVector) * 0.1;
        color.rgb += color.rgb * shadowMap * tdata.y;// * sampleSkyReflection(frx_skyLightVector) * 0.1;
    #endif


    if(frx_matGlint == 1) {
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    // frx_fragEmissive += float(frx_matHurt) * 0.5;
    color.rgb = mix(color.rgb, vec3(2.5, 0.2, 0.2), 0.25 * float(frx_matHurt)); // g;ow for hurt entities
    color.rgb = mix(color.rgb, color.rgb * 5.0, float(frx_matFlash));
    color.rgb = mix(color.rgb, unshadedColor.rgb, frx_fragEmissive * float(!frx_renderTargetParticles));
    //if(frx_fragEmissive > 0.0) color.a = 0.5;

    if(color.a <= 0.25 && frx_renderTargetSolid) discard;

    if(!frx_isGui || frx_isHand && !frx_renderTargetParticles) color.rgb += color.rgb * frx_fragEmissive * mix(EMISSIVE_BOOST.0, 1.0, frx_smoothedRainGradient * 0.5 + frx_thunderGradient * 0.5);

    // // fog that uses vanilla fog color done here, other fog done in post
    // float fogFactor = frx_smootherstep(frx_fogStart, frx_fogEnd, frx_distance);
    // if(frx_cameraInFluid == 1 && !frx_isGui) color.rgb = mix(color.rgb, frx_fogColor.rgb, fogFactor);

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    fragData = vec4(frx_fragRoughness, frx_fragReflectance, float(fmn_isWater), 1.0);

    gl_FragDepth = gl_FragCoord.z;
}