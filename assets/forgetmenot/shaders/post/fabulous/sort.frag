#include forgetmenot:shaders/lib/includes.glsl 
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_main_color;
uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_color;
uniform sampler2D u_entity_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_particles_color;
uniform sampler2D u_particles_depth;

uniform sampler2D u_normal;
uniform sampler2D u_pbr_data;

uniform sampler2D u_previous_frame;
uniform sampler2D u_composited_mips;
uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_blue_noise;

uniform sampler2DArrayShadow u_shadow_map;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// vanilla fabulous blending

#define NUM_LAYERS 6

vec4 color_layers[NUM_LAYERS];
float depth_layers[NUM_LAYERS];
int active_layers = 0;

void try_insert(vec4 color, float depth) {
    if(color.a == 0.0) {
        return;
    }

    color_layers[active_layers] = color;
    depth_layers[active_layers] = depth;

    int jj = active_layers++;
    int ii = jj - 1;
    while(jj > 0 && depth_layers[jj] > depth_layers[ii]) {
        float depthTemp = depth_layers[ii];
        depth_layers[ii] = depth_layers[jj];
        depth_layers[jj] = depthTemp;

        vec4 colorTemp = color_layers[ii];
        color_layers[ii] = color_layers[jj];
        color_layers[jj] = colorTemp;

        jj = ii--;
    }
}

vec3 blend( vec3 dst, vec4 src ) {
    return mix(dst, src.rgb, src.a);
}

float sampleCumulusCloud(in vec2 plane, in int octaves) {
    float noiseA = fbmHash(plane * 2.0, octaves, 0.001);
    float noiseB = fbmHash(plane * 2.0 + 10.0, octaves, 0.001);

    float aLowerBound = 0.7 - 0.7 * fmn_rainFactor;
    float bLowerBound = 0.5 - 0.5 * fmn_rainFactor;

    float a = smoothstep(aLowerBound, 0.9, noiseA) * ((octaves + 1.0) / octaves);
    float b = smoothstep(bLowerBound, 0.9, noiseB) * ((octaves + 1.0) / octaves);
    float x = smoothHash(plane) * 0.5 + 0.5;

    return mix(a, b, x);

    //return smoothstep(0.5, 0.9, fbmHash(plane * 2.0, octaves, 0.001));
}
float sampleCirrusCloud(in vec2 plane, in int octaves) {
    plane *= 2.0;
    float clouds = fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.5, 1.5, fbmHash(plane * 0.5, octaves, 0.01));
    return clouds;
}

vec3 getBlueNoise() {
    ivec2 coord = ivec2(gl_FragCoord.xy + frx_renderFrames % 1000u * 100u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return fNormalize(r) * 2.0 - 1.0;
}
vec3 getBlueNoise(float offset) {
    ivec2 coord = ivec2(rotate2D(texcoord, offset) * frxu_size + frx_renderFrames * 100u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return fNormalize(r) * 2.0 - 1.0;
}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

    vec4  particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;

    vec3 coords = vec3(texcoord, 0.0);
    #define REFRACTION
    #ifdef REFRACTION
        // vec3 rViewDir = fNormalize(setupSceneSpacePos(texcoord, 1.0));
        // rViewDir = refract(rViewDir, texture(u_normal, texcoord).rgb * 2.0 - 1.0, 1.1);

        float doRefraction = 0.0;
        if(translucent_depth != particles_depth) doRefraction = 1.0;
    #endif

    //translucent_depth = texture(u_translucent_depth, coords.xy).r;
    //particles_depth = texture(u_particles_depth, coords.xy).r;

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
    vec3 f0 = pbrData.rrr;
    float roughness = pbrData.b;

    vec4  main_color = texture(u_main_color, coords.xy);
    float main_depth = texture(u_main_depth, texcoord.xy).r;

    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4  weather_color = texture(u_weather_color, texcoord);
    weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
    float weather_depth = texture(u_weather_depth, texcoord).r;

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec2 coordJittered = ((texcoord * 2.0 - 1.0) + taaOffsets[frx_renderFrames % 8u] / (frxu_size)) * 0.5 + 0.5;

    vec3 maxSceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
    vec3 minSceneSpacePos = setupSceneSpacePos(texcoord, min_depth);
    vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
    vec3 viewDir = fNormalize(setupSceneSpacePos(texcoord, 1.0));

    vec2 clipPos = texcoord * 2.0 - 1.0;
    clipPos += taaOffsets[frx_renderFrames % 8u] / (frxu_size);
    vec2 newTexcoordJittered = clipPos * 0.5 + 0.5;
    vec3 jitteredViewPos = setupSceneSpacePos(newTexcoordJittered, 1.0);
    vec3 jitteredViewDir = fNormalize(jitteredViewPos);

    if(pbrData.g > 0.5 && frx_cameraInWater == 1) {
        vec3 transNormal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
        jitteredViewDir = refract(jitteredViewDir, transNormal, 1.33);
    }

    vec3 tdata = getTimeOfDayFactors();

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    vec3 ambientLightColor = vec3(0.0);
    ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;

    float skyIlluminance = frx_luminance(ambientLightColor * 6.0);

    vec3 skyLightColor = fNormalize(getSkyColor(frx_skyLightVector, 0.0)) * (skyIlluminance);
    skyLightColor = mix(skyLightColor, fNormalize(getSkyColor(-frx_skyLightVector)) * (skyIlluminance), tdata.z * clamp01(dot(viewDir, -frx_skyLightVector)));
    skyLightColor = mix(skyLightColor, vec3(0.1, 0.075, 0.06), tdata.z * (1.0 - (smoothstep(0.5, 1.0, dot(viewDir, frx_skyLightVector)) + smoothstep(0.5, 1.0, dot(viewDir, -frx_skyLightVector)))));
    skyLightColor = mix(skyLightColor, skyLightColor * 0.5, tdata.z * (smoothstep(0.5, 1.0, dot(viewDir, getMoonVector()))));

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec3 skyColor = getSkyColor(viewDir);

    if(smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, length(maxSceneSpacePos)) > 0.0) {
        skyColor = getSkyColorDetailed(jitteredViewDir, jitteredViewPos, 1.0);

        vec3 viewPos = maxSceneSpacePos;

        #ifdef CLOUDS
            if(viewDir.y > 0.0) {
                if(frx_worldIsOverworld == 1) {
                    vec2 plane = jitteredViewDir.xz / (jitteredViewDir.y + 0.1 * length(jitteredViewDir.xz));
                    plane *= 1.15;

                    plane += frx_cameraPos.xz / 150.0;

                    #ifdef CURL_NOISE
                        plane += 0.001 * curlNoise(plane * 6.0 + fmn_time / 20.0);
                        //plane += 0.0045 * fbmCurl(plane * 6.0 + fmn_time / 20.0, 10);
                    #endif

                    plane += fmn_time / 100.0;

                    float LdotV = clamp01(dot(frx_skyLightVector, viewDir));
                    float nLdotV = clamp01(dot(-frx_skyLightVector, viewDir)) * (1.0 - frx_skyLightTransitionFactor);
                    float phaseMie = max(0.0, henyeyGreenstein(LdotV, atmosphereG) + henyeyGreenstein(nLdotV, atmosphereG));

                    vec3 mie = mix(phaseMie, 1.0, smoothstep(1.9, 0.1, phaseMie)) * skyLightColor;

                    vec2 cirrusPlane = (plane - frx_cameraPos.xz / 150.0) + frx_cameraPos.xz / 1000.0;
                    float cirrusClouds = sampleCirrusCloud(cirrusPlane + 10.0 + 0.3 * vec2(smoothHash(cirrusPlane), 0.0), 3) * (4.0 / 3.0);
                    float transmittanceCirrus = exp2(-cirrusClouds * 4.0);
                    vec3 scatteringCirrus = (1.0 - transmittanceCirrus) * mie;

                    skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittanceCirrus + scatteringCirrus, smoothstep(0.0, 0.1, viewDir.y));

                    float cumulusCloudsDensity = sampleCumulusCloud(plane, CLOUD_DETAIL);

                    vec2 planeMarch = plane;
                    float stepLength = 1.0;

                    vec3 skyLightVector = mix(frx_skyLightVector, vec3(0.0, 1.0, 0.0), (1.0 - frx_skyLightTransitionFactor));
                    vec2 rayDirection = fNormalize(skyLightVector.xz / skyLightVector.y - viewDir.xz / viewDir.y);
                    rayDirection *= mix(1.0, -1.0, 1.0 - frx_skyLightTransitionFactor);

                    float opticalDepth = cumulusCloudsDensity;
                    float lightOpticalDepth = sampleCumulusCloud(plane + rayDirection * interleaved_gradient() * 0.5, CLOUD_DETAIL);

                    float transmittance = exp2(-opticalDepth * mix(4.0, 16.0, smoothstep(0.8, 1.0, dot(viewDir, abs(frx_skyLightVector)))));

                    vec3 scattering = vec3(exp2(-lightOpticalDepth * (2.5 + 3.0 * fmn_rainFactor))) * mie;
                    scattering *= (1.0 - transmittance);

                    skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittance + scattering, smoothstep(0.0, 0.05, viewDir.y));

                    #ifdef CLOUD_LIGHT_RAYS
                        float lightRaysOpticalDepth = 0.0;

                        rayDirection = fNormalize(frx_skyLightVector.xz / frx_skyLightVector.y - viewDir.xz / viewDir.y);

                        for(int i = 0; i < 1; i++) {
                            planeMarch += rayDirection * stepLength * 2.0 * interleaved_gradient();

                            float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_DETAIL);
                            lightRaysOpticalDepth += currentDensity * 10.0;
                        }
                        float lightRays = exp2(-lightRaysOpticalDepth * 50.0);
                        lightRays *= smoothstep(0.4, 0.0, frx_skyLightVector.y) * (getTimeOfDayFactors().x);


                        skyColor.rgb = mix(skyColor.rgb, skyColor.rgb + (0.25 * skyLightColor * henyeyGreenstein(LdotV, 0.75)) * lightRays, smoothstep(0.0, 0.1, viewDir.y));
                    #endif
                }

                skyColor.rgb += rand1D(texcoord * 2000.0) / 555.0;
            }
        #endif

        main_color.rgb = mix(main_color.rgb, skyColor, floor(max_depth));
    } 

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending same as mojang (mostly)
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    //try_insert(weather_color, weather_depth);
    try_insert(particles_color, particles_depth);
    //if(clouds_depth < max_depth) color_layers[0].rgb = mix(color_layers[0].rgb, clouds_color.rgb, clouds_color.a);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // other stuff
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // vec2 jitterCoord = texcoord + taaOffsets[frx_renderFrames % 8u] / frxu_size;

    // vec3 jitterPos = setupSceneSpacePos(jitterCoord, min_depth);
    vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
    vec3 lastScreenPos = lastFrameSceneSpaceToScreenSpace(minSceneSpacePos + positionDifference);

    vec3 bloomyFogColor = textureLod(u_composited_mips, lastScreenPos.xy, 0).rgb / 6.0;

    if(pbrData.g > 0.5) {
        float sunDotU = getSunVector().y;

        float waterFogDistance = distance(minSceneSpacePos, maxSceneSpacePos); // warning: destroys underwater translucent visibility

        //vec3 waterFogColor = vec3(0.0, 0.16, 0.09)  * max(0.25, sunDotU);
        vec3 waterFogColor = translucent_color.rgb * translucent_color.a;
        waterFogColor *= (clamp01(sunDotU) * 0.9  + 0.1) * (frx_smoothedEyeBrightness.y * 0.95 + 0.05);
        
        if(max_depth == 1.0) waterFogDistance *= 0.0;
        float fogDensity = 1.0 - exp2(-waterFogDistance * 0.5);
        float foggerDensity = 1.0 - exp2(-waterFogDistance * 1.5);

        composite = mix(composite, bloomyFogColor, foggerDensity);
        composite = mix(composite, waterFogColor, fogDensity);
        //composite = mix(composite * mix(vec3(1.0), vec3(0.36, 1.0, 0.81), foggerDensity), waterFogColor, fogDensity);
    }

    vec3 reflectance, reflectColor;
    if(min_depth < 1.0) {
        if(f0.r > 0.0) {
            vec3 reflectionCoord;
            bool ssrHit = false;

            #define SSR_STEPS 64
            const int depthLod = 2;

            vec3 screenPos = vec3(texcoord, min_depth);
            vec3 viewSpaceDir = fNormalize(setupViewSpacePos(texcoord, 1.0));

    //rand3D((texcoord + frx_renderSeconds) * 2000.0)
            vec3 cosineDistribution = getBlueNoise();
            vec3 microfacetNormal = frx_normalModelMatrix * fNormalize(normal + fNormalize(cosineDistribution) * roughness * roughness * (interleaved_gradient()));
            if(dot(viewDir, microfacetNormal) < 0.0) microfacetNormal = -microfacetNormal;

            vec3 viewSpaceReflectionDir = reflect(viewSpaceDir, microfacetNormal);

            vec3 screenSpaceReflectionDir = fNormalize(viewSpaceToScreenSpace(minViewSpacePos + viewSpaceReflectionDir) - screenPos);

            float stepLength = 1.0 / SSR_STEPS;

            reflectColor = mix(
                (getFogScattering(viewDir, 750000.0 - 500000.0 * frx_skyLightVector.y)) * 0.25,
                getSkyColorDetailed(reflect(viewDir, microfacetNormal * frx_normalModelMatrix), reflect(minSceneSpacePos, microfacetNormal * frx_normalModelMatrix), 1.0),
                clamp01(clamp01(frx_worldIsEnd + frx_smoothedEyeBrightness.y) - frx_cameraInWater)
            );
            reflectColor = mix(reflectColor, UNDERWATER_FOG_COLOR * max(0.1, frx_skyLightVector.y) * max(0.1, frx_smoothedEyeBrightness.y), frx_cameraInWater);
            
            reflectance = vec3(0.0);
            reflectance = getReflectance(f0, clamp01(dot(normal, -viewDir)));
            if(reflectance.r > 0.999) reflectance = vec3(1.0);

            if(roughness * roughness < 0.5 && (reflect(minViewSpacePos, microfacetNormal) + viewSpaceReflectionDir * stepLength).z < 0.0) {
                for(int i = 0; i < SSR_STEPS; i++) {
                    screenPos += screenSpaceReflectionDir * stepLength * (interleaved_gradient(i) * 0.2 + 0.8);

                    if(clamp01(screenPos.xy) != screenPos.xy) {
                        break;
                    } else {
                        float depthQuery = texelFetch(u_depth_mipmaps, ivec2(screenPos.xy * frxu_size * 0.25), 2).r;
                        // float ldepth = linearizeDepth(screenPos.z), lsample = linearizeDepth(depthQuery);

                        if(depthQuery == 1.0) {
                            //stepLength = 2.0 / SSR_STEPS;
                            continue;
                        }

                        float lenience = max(abs((screenSpaceReflectionDir.z)) * 3.0, 0.02 / pow(length(minSceneSpacePos), 2.0));

                        if(abs(lenience - (screenPos.z - depthQuery)) < lenience) {
                            //reflectColor = texture(u_previous_frame, screenPos.xy).rgb;
                            reflectionCoord = screenPos;
                            ssrHit = true;

                            float binaryStepLength = stepLength * 0.5;
                            reflectionCoord -= screenSpaceReflectionDir * binaryStepLength;
                            for(int i = 0; i < 4; i++) {
                                reflectionCoord += sign(texelFetch(u_depth_mipmaps, ivec2(reflectionCoord.xy * frxu_size), 0).r - reflectionCoord.z) * screenSpaceReflectionDir * binaryStepLength;
                                binaryStepLength *= 0.5;
                            }

                            break;
                        }
                    }
                }
            }

            //if(frx_luminance(reflectColor.rgb) > 5.5 && !ssrHit) reflectance = vec3(0.5);

            vec3 rView = setupSceneSpacePos(reflectionCoord.xy, reflectionCoord.z);
            reflectionCoord = lastFrameSceneSpaceToScreenSpace(rView + frx_cameraPos - frx_lastCameraPos);

            if(ssrHit) reflectColor = texelFetch(u_previous_frame, ivec2(reflectionCoord.xy * frxu_size), 0).rgb;
            if(f0.r > 0.999) reflectColor *= (composite);

            // if(frx_cameraInWater == 1) {
            //     reflectance = vec3(0.0);

            //     reflectColor = vec3(0.0, 0.5, 0.4) * max(0.1, frx_skyLightVector.y);
            // }

        }
        if((acos(dot(normal, -viewDir)) * (180 / PI) > 48.60172336679899) && frx_cameraInWater == 1 && pbrData.g > 0.5) {
            reflectance = vec3(1.0);

            //reflectColor = vec3(0.0, 0.5, 0.4) * max(0.1, frx_skyLightVector.y);
            composite = vec3(1.0, 0.0, 0.0);
        }

        composite = mix(composite, reflectColor, reflectance);
        //composite = normal;
    }

    float blockDist = min(frx_viewDistance, length(minSceneSpacePos));
    float sunDotU = getSunVector().y;

    float bloomyFogTransmittance = 1.0;
    #ifdef ATMOSPHERIC_FOG
        float fogTransmittance = 1.0;
        if(frx_worldIsOverworld == 1) {
            float vl = 0.0;

            #ifdef VOLUMETRIC_LIGHTING
                const int VL_SAMPLES = 8;

                vec3 vlPos = minSceneSpacePos;
                vec3 traceDir = -vlPos;
                
                if(min_depth < 1.0) {
                    vl = 0.0;

                    for(int i = 0; i < VL_SAMPLES; i++) {
                        vlPos += traceDir / VL_SAMPLES * interleaved_gradient(i);

                        // shadow
                        vec4 shadowViewPos = frx_shadowViewMatrix * vec4(vlPos, 1.0);
                        int cascade = selectShadowCascade(shadowViewPos);
                        vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
                        vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

                        float shadowFactor;
                        shadowFactor = texture(u_shadow_map, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z));

                        vl += (shadowFactor / VL_SAMPLES) * tanh(distance(minSceneSpacePos, vlPos) / 16.0);

                    }

                    // composite *= vl;
                }
            #endif

            float fogDist = blockDist;
            if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
            fogDist /= 256.0;

            float fogOpticalDepth = 750000.0 - 500000.0 * frx_skyLightVector.y;
            //fogOpticalDepth = fogDist * 3000000.0;
            float fogAmount = 0.3 - 0.25 * (1.0 - clamp01(frx_skyLightVector.y));
            fogAmount += 3.0 * smoothstep(0.0, -10.0, frx_cameraPos.y);
            fogAmount *= mix(1.0, 4.0, 1.0 - sqrt(sqrt(clamp01(getSunVector().y))));
            fogAmount *= mix(1.0, 0.1, sqrt(clamp01(getSunVector().y)));

            fogAmount += 5.0 * fmn_rainFactor * frx_smoothedEyeBrightness.y;

            //fogAmount *= 10.0;

            #ifdef VOLUMETRIC_LIGHTING
                fogAmount *= 0.1;
            #endif

            fogTransmittance = exp(-fogDist * (3.0 - 2.0 * frx_skyLightVector.y) * (fogAmount + 0.3 * (1.0 - frx_smoothedEyeBrightness.y - frx_worldIsEnd) + 30.0 * frx_cameraInFluid));
            //fogTransmittance = mix(0.0, fogTransmittance, step(0.5, texcoord.x));

            bloomyFogTransmittance = fogTransmittance;
            fogTransmittance = mix(fogTransmittance, 1.0, floor(min_depth));
            if(frx_cameraInFluid == 1 && min_depth == 1.0) fogTransmittance = 0.0;

            vec3 fogScattering = getSkyColor(viewDir, 0.0, 1.0 * vl);
            //fogScattering = getFogScattering(viewDir, particleThickness(0.1));
            fogScattering = mix(fogScattering, mix(vec3(0.1, 0.2, 0.4), vec3(0.1, 0.05, 0.025), smoothstep(0.0, -10.0, frx_cameraPos.y)), 1.0 - frx_smoothedEyeBrightness.y);
            fogScattering = mix(fogScattering, UNDERWATER_FOG_COLOR * max(0.1, getSunVector().y) * max(0.1, frx_smoothedEyeBrightness.y), frx_cameraInWater);
            
            fogScattering *= (1.0 - fogTransmittance);

            composite = composite * fogTransmittance + fogScattering;
        } else if(frx_worldIsNether == 1) {
            float fogDist = blockDist;
            if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
            fogDist /= 64.0;

            fogTransmittance = exp(-fogDist);
            bloomyFogTransmittance = fogTransmittance;
            vec3 fogScattering = pow(frx_fogColor.rgb * 2.0, vec3(2.2)) * (1.0 - fogTransmittance);

            composite = composite * fogTransmittance + fogScattering;
        }
    #endif

    #define BLOOMY_FOG
    #ifdef BLOOMY_FOG
        bloomyFogTransmittance = mix(bloomyFogTransmittance, 0.0, floor(min_depth));

        if(frx_worldIsOverworld == 1) {
            bloomyFogTransmittance = mix(bloomyFogTransmittance, 1.0, (1.0 - fmn_rainFactor) * frx_smoothedEyeBrightness.y * smoothstep(0.0, 0.3, viewDir.y));
        } else if(frx_worldIsEnd == 1) {
            bloomyFogTransmittance = 1.0;
        }

        composite = mix(bloomyFogColor, composite, bloomyFogTransmittance * 0.875 + 0.125);
        skyColor = mix(bloomyFogColor, skyColor, bloomyFogTransmittance * 0.75 + 0.25);
    #endif

    #ifdef BORDER_FOG
        if(min_depth < 1.0 && frx_cameraInFluid == 0) composite = mix(composite, skyColor, smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, blockDist));
    #endif

    #ifdef frx_darknessEffectFactor
        float sinTime = sin(fmn_time);
        float timeFactor = sinTime * sinTime * sinTime * sinTime * sinTime * sinTime;
        float darknessFactor = max(0.0, (frx_darknessEffectFactor) * 0.75 + 0.25);
        composite = mix(composite, vec3(0.0), (smoothstep(0.0, 20.0 * darknessFactor, blockDist)) * frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
    #endif

    if(weather_depth < min_depth) {
        composite = mix(composite, weather_color.rgb, weather_color.a);
    }

    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, doRefraction));
}
