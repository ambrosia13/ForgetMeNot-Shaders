#include forgetmenot:shaders/lib/includes.glsl 
#include forgetmenot:shadows

uniform sampler2D u_main_color;
uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_color;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_entity_color;
uniform sampler2D u_entity_depth;
uniform sampler2D u_weather_color;
uniform sampler2D u_weather_depth;
uniform sampler2D u_clouds_color;
uniform sampler2D u_clouds_depth;
uniform sampler2D u_particles_color;
uniform sampler2D u_particles_depth;

uniform sampler2D u_translucent_data;
uniform sampler2D u_solid_data;

uniform sampler2D u_normal;
uniform sampler2D u_translucent_vertex_normal;
uniform sampler2D u_pbr_data;
uniform sampler2D u_previous_frame;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 globalIllumination;

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
    return ( dst * ( 1.0 - src.a ) ) + src.rgb;
}

float sampleCumulusCloud(in vec2 plane, in int octaves) {
    float worldTime = frx_worldDay + frx_worldTime;
    worldTime *= 0.1;

    // 0.3 to 0.7
    float coverageBias = 0.5;

    // 0.2 to 0.35
    float mistiness = 0.2;

    // 1.3 to 3.3
    float irregularity = 1.3;

    // 0.0 to 2.0
    float windWispyness = 0.0;

    // 0.5 to 1.0
    float density = 1.0;

    #ifdef DYNAMIC_WEATHER
        coverageBias += smoothHash(plane * 0.1 + 20.0 * (worldTime + 4.0) + fmn_time / 60.0) * 0.2;
        mistiness += smoothHash(100.0 + plane * 0.1 + 20.0 * (worldTime + 7.0) + fmn_time / 60.0) * 0.15 + 0.15;
        //irregularity += smoothHash(500.0 + plane * 0.1 + 20.0 * (worldTime + 7.0) + fmn_time / 60.0) + 1.0;
        //windWispyness += smoothHash(1000.0 + plane * 0.1 + 20.0 * (worldTime + 7.0) + fmn_time / 60.0) + 1.0;
        density += smoothHash(2000.0 + plane * 0.1 + 20.0 * (worldTime + 7.0) + fmn_time / 60.0) * 0.25 - 0.25;
    #endif

    coverageBias = mix(coverageBias, 0.35, frx_smoothedRainGradient);
    coverageBias = mix(coverageBias, 0.15, frx_smoothedThunderGradient);
    coverageBias = clamp(coverageBias, 0.3, 0.7);
    mistiness = mix(mistiness, 0.3, frx_smoothedRainGradient);
    float lowerBound = coverageBias;
    float upperBound = coverageBias + mistiness;
    
    if(windWispyness > 0.0) plane.x += windWispyness * fbmHash(plane.yy * 0.3, 3, 0.01);

    float noiseLocal = mix(smoothHash(plane * irregularity + fmn_time / 40.0), smoothHash(plane * irregularity + fmn_time / 60.0 + 10.0), 0.5);
    float clouds = (smoothstep(lowerBound + 0.2 * noiseLocal, upperBound + 0.2 * noiseLocal, fbmHash(plane, octaves, 0.001)));

    return clouds * ((octaves + 1.0) / octaves);

    // float noiseLocal = fbmHash(plane * 2.0, octaves, 0.001);
    // float n2 = fbmHash(plane * 2.0 + 10.0, octaves, 0.001);

    // float a = smoothstep(0.7, 0.8, noiseLocal) * ((octaves + 1.0) / octaves);
    // float b = smoothstep(0.5, 0.7, n2) * ((octaves + 1.0) / octaves);
    // float x = smoothHash(plane) * 0.5 + 0.5;

    // return mix(a, b, x);
}
float sampleCirrusCloud(in vec2 plane, in int octaves) {
    plane *= 2.0;
    float clouds = fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.4, 1.5, fbmHash(plane * 0.5, octaves, 0.01));
    return clouds;
}

vec2 Jitter(vec2 fragCoord, int frame)
{
    int num = 8;
    return (vec2(fragCoord + 0.25 * normalize(rand2D(vec2(frame)))));

}

bool isSolid(vec3 pos) {
    vec3 cellPos = floor(pos);
    return snoise(cellPos.xz) > 0.5;
}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
    vec3 f0 = pbrData.rrr;

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

    // vec3 translucentVertexNormal = texture(u_translucent_vertex_normal, texcoord.xy).rgb * 2.0 - 1.0;
    // float normalDifference = distance(translucentVertexNormal, normal);
    // vec2 refractionCoord = texcoord + 0.1 * (normalDifference - 2.0 * normalDifference);

    // if(all(equal(translucentVertexNormal, vec3(-1.0)))) refractionCoord = texcoord;

    vec4  main_color = texture(u_main_color, texcoord);
    float main_depth = texture(u_main_depth, texcoord).r;
    
    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4  weather_color = texture(u_weather_color, texcoord);
    weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
    float weather_depth = texture(u_weather_depth, texcoord).r;

    vec4  clouds_color = texture(u_clouds_color, texcoord);
    clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));
    float clouds_depth = texture(u_clouds_depth, texcoord).r;

    vec4  particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;


    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
    vec3 viewDir = normalize(maxViewSpacePos);

    vec3 tdata = getTimeOfDayFactors();

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec3 skyColor = getSkyColor(viewDir);

    if(max(max_depth, max(clamp(clouds_depth, 0.0, 0.999), clamp(weather_depth, 0.0, 0.999))) == 1.0) {

        main_color.rgb = getSkyColorDetailed(viewDir, minViewSpacePos);

        vec3 ambientLightColor = vec3(0.0);
        ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);
        vec3 skyLightColor = mix(normalize(getSkyColor(normalize(frx_skyLightVector - vec3(0.0, 0., 0.0)))), normalize(vec3(5.0, 1.75, 0.5)), 1.0 - frx_skyLightTransitionFactor) * (skyIlluminance / 1.5);
        skyLightColor *= mix(vec3(1.0), vec3(0.5, 0.7, 1.5), (1.0 - frx_skyLightTransitionFactor) * smoothstep(0.0, 0.1, dot(viewDir, getMoonVector())));

        vec3 viewPos = maxViewSpacePos;

        if(viewDir.y > 0.0) {
            if(frx_worldIsOverworld == 1) {
                vec2 plane = viewPos.xz / (viewPos.y + 0.1 * length(viewPos.xz));
                plane += fmn_time / 100.0;

                vec2 cirrusPlane = plane;

                #ifdef CURL_NOISE
                    plane += 0.0045 * curlNoise(plane * 3.0 + fmn_time / 20.0);
                    //plane += 0.0045 * fbmCurl(plane * 6.0 + fmn_time / 20.0, 10);
                #endif


                float LdotV = clamp01(dot(frx_skyLightVector, viewDir));
                float nLdotV = clamp01(dot(-frx_skyLightVector, viewDir)) * (1.0 - frx_skyLightTransitionFactor);
                vec3 mie = max(1.0, miePhase(LdotV, 10.0) + miePhase(nLdotV, 10.0)) * skyLightColor;

                float cirrusClouds = sampleCirrusCloud(cirrusPlane + 10.0 + 0.3 * vec2(smoothHash(cirrusPlane), 0.0), 3) * (4.0 / 3.0);
                float transmittanceCirrus = exp2(-cirrusClouds * 4.0);
                vec3 scatteringCirrus = (1.0 - transmittanceCirrus) * mie;

                main_color.rgb = mix(main_color.rgb, main_color.rgb * transmittanceCirrus + scatteringCirrus, smoothstep(0.0, 0.1, viewDir.y));


                float cumulusCloudsDensity;
                cumulusCloudsDensity = sampleCumulusCloud(plane, CLOUD_DETAIL);

                vec2 planeMarch = plane;
                float stepLength = 1.0 / 8.0;

                vec3 skyLightVector = mix(frx_skyLightVector, vec3(0.0, 1.0, 0.0), (1.0 - frx_skyLightTransitionFactor));
                vec2 rayDirection = normalize(skyLightVector.xz / skyLightVector.y - viewDir.xz / viewDir.y) / 2.0;
                rayDirection = mix(rayDirection, -rayDirection, 1.0 - frx_skyLightTransitionFactor);

                float opticalDepth;
                float lightOpticalDepth;

                float transmittance = 1.0;
                vec3 scattering;
                for(int i = 0; i < 3; i++) {
                    planeMarch += rayDirection * stepLength * interleaved_gradient();


                    float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_SHADING_DETAIL);
                    //if(currentDensity == 0.0) break;

                    lightOpticalDepth += currentDensity / 8.0;

                    //if(currentDensity == 0.0) break;

                    stepLength *= 1.5;
                }

                //lightOpticalDepth = mix(lightOpticalDepth, 0.5, 1.0 - frx_skyLightTransitionFactor);


                opticalDepth = cumulusCloudsDensity;

                transmittance = exp2(-opticalDepth * 4.0);
                scattering = vec3(exp2(-lightOpticalDepth * 5.0) * (1.0 - transmittance)) * mie;
                //scattering = mix(scattering, vec3(0.1 * mie), 1.0 - frx_skyLightTransitionFactor);

                main_color.rgb = mix(main_color.rgb, main_color.rgb * transmittance + scattering, smoothstep(0.0, 0.1, viewDir.y));

                #ifdef CLOUD_LIGHT_RAYS
                    float lightRaysOpticalDepth = 0.0;
                    for(int i = 0; i < 10; i++) {
                        planeMarch += rayDirection * 0.15;
                        float currentDensity = sampleCumulusCloud(planeMarch, 7);

                        //if(currentDensity > 0.5) break;

                        lightRaysOpticalDepth += currentDensity / 10.0;
                    }
                    float lightRaysTransmittance = exp2(-lightRaysOpticalDepth * 15.0);
                    //lightRaysTransmittance = mix(lightRaysTransmittance, 1.0, 0.0 * smoothstep(1.0, 0.5, 1.0 * clamp01(dot(viewDir, frx_skyLightVector))));
                    vec3 lightRaysScattering = vec3(-0.0) * (1.0 - lightRaysTransmittance);

                    float lightRaysFactor = smoothstep(0.75, 1.0, 1.0 * clamp01(dot(viewDir, frx_skyLightVector)));
                    if(lightRaysFactor > 0.0) main_color.rgb = mix(main_color.rgb, main_color.rgb + (0.5 * mie * lightRaysFactor) * lightRaysTransmittance, smoothstep(0.0, 0.1, viewDir.y));
                #endif
            }

            main_color.rgb += rand1D(texcoord * 2000.0) / 555.0;
        }
    } 
    if(pbrData.g > 0.5) {
        translucent_color.rgb *= vec3(1.0, 1.3, 0.7);
        float sunDotU = dot(getSunVector(), vec3(0.0, 1.0, 0.0));

        float waterFogDistance = distance(minViewSpacePos, maxViewSpacePos); // warning: destroys underwater translucent visibility

        vec3 waterFogColor = vec3(0.0, 0.16, 0.09)  * max(0.25, sunDotU);
        //vec3 waterFogColor = translucent_color.rgb / vec3(frx_luminance(translucent_color.rgb));
        waterFogColor *= (clamp01(sunDotU) * 0.9  + 0.1) * (frx_smoothedEyeBrightness.y * 0.95 + 0.05);
        
        if(max_depth == 1.0) waterFogDistance *= 1000.0;
        float fogDensity = 1.0 - exp2(-waterFogDistance * 1.0);

        // if(min_depth == 1.0) {
            translucent_color.rgb = mix(translucent_color.rgb, waterFogColor, fogDensity);
            translucent_color.a = mix(translucent_color.a, 0.99, fogDensity);
        // }

    }

    if(frx_cameraInWater == 1) {
        main_color.rgb *= vec3(0.16, 0.81, 1.0);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending same as mojang (mostly)
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    
    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    try_insert(weather_color, weather_depth);
    try_insert(particles_color, particles_depth);
    //if(clouds_depth < max_depth) color_layers[0].rgb = mix(color_layers[0].rgb, clouds_color.rgb, clouds_color.a);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // other stuff
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec2 jitterCoord = (Jitter(gl_FragCoord.xy, int(frx_renderFrames))) / frxu_size;



    #ifdef RTAO 
        const float RTAO_BLEND_FACTOR = 0.05;
        vec3 rtao = vec3(1.0);

        vec3 jitterPos = setupViewSpacePos(jitterCoord, min_depth);
        vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
        vec3 lastScreenPos = lastFrameViewSpaceToScreenSpace(minViewSpacePos + positionDifference);
        vec4 lastFrameSample = texture(u_previous_frame, lastScreenPos.xy);
        vec3 lastFrameRtao = lastFrameSample.aaa;
    #endif

    if(min_depth < 1.0) {
        if(f0.r > 0.0) {
            vec3 reflectionCoord;
            bool ssrHit = false;

            #define SSR_STEPS 32
            vec3 screenPos = vec3(texcoord, min_depth);

            vec3 viewSpaceReflectionDir = reflect(viewDir, normal);
            vec3 screenSpaceReflectionDir = normalize(viewSpaceToScreenSpace(minViewSpacePos + viewSpaceReflectionDir) - screenPos);

            float stepLength = 1.0 / SSR_STEPS;

            vec3 reflectColor = max(vec3(0.005), getSkyColorDetailed(viewSpaceReflectionDir, reflect(minViewSpacePos, normal)) * clamp01(frx_worldIsEnd + frx_smoothedEyeBrightness.y));
            
            vec3 reflectance = vec3(0.0);

            if(frx_worldIsEnd != 1 || true) {
                if(frx_luminance(reflectColor.rgb) > 5.5) reflectance = vec3(0.5);

                for(int i = 0; i < SSR_STEPS; i++) {
                    screenPos += screenSpaceReflectionDir * stepLength * mix(interleaved_gradient(), 1.0, clamp01(0.22 + 0.01 * SSR_STEPS));


                    if(clamp01(screenPos.xy) != screenPos.xy) {
                        break;
                    } else {
                        float depthQuery = texture(u_particles_depth, screenPos.xy).r;

                        if(depthQuery == 1.0) continue;

                        float lenience = max(abs(screenSpaceReflectionDir.z) * 3.0, 0.22 / pow(length(minViewSpacePos), 2.0));

                        if(abs(lenience - (screenPos.z - depthQuery)) < lenience) {
                            //reflectColor = texture(u_previous_frame, screenPos.xy).rgb;
                            reflectionCoord = screenPos;
                            ssrHit = true;

                            break;
                        }
                    }
                    //stepLength *= 1.06;
                }

                float binaryStepLength = 0.5 / SSR_STEPS;
                for(int i = 0; i < 4; i++) {
                    reflectionCoord += sign(texture(u_particles_depth, reflectionCoord.xy).r - reflectionCoord.z) * screenSpaceReflectionDir * binaryStepLength;
                    binaryStepLength *= 0.5;
                }

            }

            if(ssrHit) reflectColor = texture(u_previous_frame, reflectionCoord.xy).rgb;

            if(reflectance.r == 0.0) reflectance = getReflectance(f0, clamp01(dot(normal, -viewDir)));
            // if(frx_cameraInWater == 1 && acos(dot(normal, -viewDir)) * (180 / PI) > 60.0) {
            //     reflectance = vec3(1.0);

            //     if(!ssrHit) reflectColor = vec3(0.0, 0.5, 0.4) * max(0.1, frx_skyLightVector.y);
            // }

            composite = mix(composite, reflectColor, reflectance);
            //composite = normal;
        }

        #ifdef RTAO
            const int RTAO_RAYS = 1;
            const int RTAO_STEPS = 10;

            vec3 rayPos = minViewSpacePos;
            vec3 rayDir = (normal);
            float stepLength = 5.0 / RTAO_STEPS;

            for(int i = 0; i < RTAO_STEPS; i++) {
                rayPos += (normalize(rayDir + normalize(rand3D(2000.0 * (i + texcoord + fmn_time)))) * stepLength) * interleaved_gradient(i);

                vec3 rayScreen = viewSpaceToScreenSpace(rayPos);

                if(clamp01(rayScreen) != rayScreen) {
                    break;
                } else {
                    float depthQuery = texture(u_translucent_depth, rayScreen.xy).r;

                    if(rayScreen.z > depthQuery && distance(rayPos, setupViewSpacePos(rayScreen.xy, depthQuery)) < 1.0) {
                        rtao *= 0.1;
                        break;
                    }
                }

                stepLength *= 1.0;
            }

            composite *= mix(lastFrameRtao, rtao, 0.05);
        #endif

        #ifdef RAYTRACED_HELD_LIGHT
            const int HELD_LIGHT_STEPS = 10;
// float heldLightFactor = frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, frx_vertex.xyz + frx_cameraPos));
// heldLightFactor *= clamp01(dot(-frx_fragNormal, normalize((frx_vertex.xyz + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0))));

            vec3 heldLightPos = ((minViewSpacePos.xyz + vec3(0.1, 0.0, 0.1)) + frx_cameraPos - frx_eyePos) + vec3(-0.1, -1.5, 0.0);
            vec2 seed = vec2(fmn_time);
            heldLightPos += vec3(smoothHash(seed), smoothHash(seed - 100.0), smoothHash(seed + 100.0)) * 0.1;

            vec3 rayPos = minViewSpacePos;
            vec3 rayDir = -(heldLightPos);
            float stepLength = 0.05 / HELD_LIGHT_STEPS;

            if(!all(equal(frx_heldLight.rgb, vec3(1.0))) && frx_smoothedEyeBrightness.y < 0.9) {
                for(int i = 0; i < HELD_LIGHT_STEPS; i++) {
                    rayPos += (rayDir / HELD_LIGHT_STEPS) * (interleaved_gradient() * 0.75 + 0.25) + rand3D(texcoord * 2000.0 + 100.0 * fmn_time) * 0.001;

                    vec3 rayScreen = viewSpaceToScreenSpace(rayPos);

                    if(clamp01(rayScreen) != rayScreen) {
                        break;
                    } else {
                        float depthQuery = texture(u_translucent_depth, rayScreen.xy).r;

                        if(rayScreen.z > depthQuery && distance(rayPos, setupViewSpacePos(rayScreen.xy, depthQuery)) < 1.0) {
                            rtao *= 0.2 + 0.8 * frx_smoothedEyeBrightness.y;
                            break;
                        }
                    }

                    stepLength *= 1.5;
                }
            }

            composite *= mix(lastFrameRtao, rtao, 0.5);
        #endif

    }

        float blockDist = length(minViewSpacePos);
        float sunDotU = getSunVector().y;

        #ifdef ATMOSPHERIC_FOG
            if(frx_worldIsOverworld == 1) {
                float fogDist = blockDist;
                if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
                fogDist /= 256.0;

                float fogOpticalDepth = 750000.0 - 500000.0 * frx_skyLightVector.y;
                //fogOpticalDepth = fogDist * 3000000.0;
                float fogAmount = 0.15;
                fogAmount += 0.9 * smoothstep(0.0, -10.0, frx_cameraPos.y);

                float fogTransmittance = exp(-fogDist * (fogAmount + 0.3 * (1.0 - frx_smoothedEyeBrightness.y - frx_worldIsEnd) + 30.0 * frx_cameraInFluid));
                //fogTransmittance = mix(0.0, fogTransmittance, step(0.5, texcoord.x));

                if(min_depth == 1.0) fogTransmittance = 1.0;
                if(frx_cameraInFluid == 1 && min_depth == 1.0) fogTransmittance = 0.0;

                vec3 fogScattering = getFogScattering(viewDir, fogOpticalDepth);
                fogScattering = mix(fogScattering, mix(vec3(0.1, 0.2, 0.4), vec3(0.05, 0.025, 0.1), smoothstep(0.0, -10.0, frx_cameraPos.y)), 1.0 - frx_smoothedEyeBrightness.y);
                fogScattering = mix(fogScattering, vec3(0.0, 0.5, 0.4) * max(0.1, sunDotU), frx_cameraInWater);

                fogScattering *= (1.0 - fogTransmittance);

                composite = composite * fogTransmittance + fogScattering;
            } else if(frx_worldIsNether == 1) {
                float fogDist = blockDist;
                if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
                fogDist /= 64.0;

                float fogTransmittance = exp(-fogDist);
                vec3 fogScattering = pow(frx_fogColor.rgb * 2.0, vec3(2.2)) * (1.0 - fogTransmittance);

                composite = composite * fogTransmittance + fogScattering;
            }
        #endif

        #ifdef BORDER_FOG
            if(min_depth < 1.0 && frx_cameraInFluid == 0) composite = mix(composite, skyColor, smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, blockDist));
        #endif

        #ifdef frx_darknessEffectFactor
            float sinTime = sin(fmn_time);
            float timeFactor = sinTime * sinTime * sinTime * sinTime * sinTime * sinTime;
            float darknessFactor = max(0.0, (frx_darknessEffectFactor) * 0.45 + 0.55);
            composite = mix(composite, vec3(0.0), (smoothstep(0.0, 10.0 * darknessFactor, blockDist)) * frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
        #endif

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));

    #ifdef RTAO
        float alpha = frx_luminance(mix(lastFrameRtao, rtao, RTAO_BLEND_FACTOR));
    #else
        float alpha = 1.0;
    #endif


    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, alpha));
}
