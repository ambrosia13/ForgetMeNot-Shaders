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
    float n = mix(snoise(plane * 0.3 + frx_renderSeconds / 40.0), snoise(plane * 0.6 + frx_renderSeconds / 60.0), 0.5);
    float d = (smoothstep(0.5 + 0.2 * n, 0.7 + 0.2 * n, fbmHash(plane, octaves, 0.001)));

    return d;
}
float sampleCirrusCloud(in vec2 plane, in int octaves) {
    plane *= 2.0;
    float d = fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.4, 1.5, fbmHash(plane * 0.5, octaves, 0.01));
    return d;
}

vec2 Jitter(vec2 fragCoord, int frame)
{
    int num = 8;
    return (vec2(fragCoord + 0.25 * normalize(rand2D(vec2(frame)))));

}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

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

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    vec3 pbrData = texture(u_pbr_data, texcoord).rgb;
    vec3 f0 = pbrData.rrr;

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
    // vec3 secondViewDir = viewDir;
    // if(frx_worldIsEnd == 1) {
    //     viewDir.y = -viewDir.y;
    //     maxViewSpacePos.y = -maxViewSpacePos.y;
    //     viewDir.xy = rotate2D(viewDir.xy, -0.1);
    //     maxViewSpacePos.xy = rotate2D(maxViewSpacePos.xy, -0.1);

    //     viewDir.y += 0.2;
    //     viewDir = normalize(viewDir);

    //     secondViewDir.yz = rotate2D(secondViewDir.yz, 0.7);
    //     secondViewDir.xy = rotate2D(secondViewDir.xy, -0.74);
    //     secondViewDir.y += 0.95;
    //     secondViewDir = normalize(secondViewDir);
    // }

    vec3 skyColor = getSkyColor(viewDir);
    // skyColor += endSecondAtmosphere(secondViewDir, normalize(vec3(1.0, 0.1, 0.2)), 1.0, 1.0);
    // if(secondViewDir.y < 0.0) {
    //     skyColor += vec3(0.09, 0.12, 0.03) * smoothstep(-0.1, 0.8, dot(normalize(vec3(1.0, 0.6, 0.2)), secondViewDir));
    // }

    // //maxViewSpacePos.y -= 120.0;
    // vec2 endPlane = maxViewSpacePos.xz / (maxViewSpacePos.y + 0.1 * length(maxViewSpacePos.xz));
    // //endPlane += frx_renderSeconds / 40.0;
    // //endPlane *= 1.2;
    // //endPlane += frx_renderSeconds * 0.01;
    // //endPlane += curlNoise(endPlane);
    // float endIslands = fbmHash(floor(endPlane * 64.0) / 64.0, 4, 0.0);
    // float offset = 0.1;
    // float height1 = fbmHash((floor(endPlane * 64.0) / 64.0) + vec2(offset, 0.0), 4, 0.0);
    // float height2 = fbmHash((floor(endPlane * 64.0) / 64.0) + vec2(0.0, offset), 4, 0.0);
    
    // float deltaX = (endIslands - height1) * 12.0;
    // float deltaY = (endIslands - height2) * 12.0;

    // vec3 endIslandNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));
    // endIslandNormal = normalize(endIslandNormal);
    // endIslandNormal.y = -endIslandNormal.y;
    
    // float endSkyShading = dot(-endIslandNormal, normalize(vec3(1.0, 0.1, 0.2))) * 0.5 + 1.0;

    // //endPlane -= frx_renderSeconds / 40.0;

    // if(frx_worldIsEnd == 1 && viewDir.y < 0.0) {
    //     skyColor += vec3(0.01, 0.0, 0.01);
    //     skyColor += (1.0 - tanh(length(endPlane) * 0.25)) * 1.3 * mix(vec3(0.06, 0.07, 0.02) * endSkyShading, skyColor, tanh(length(endPlane) * 0.25)) * (2.0 * step(0.7, endIslands) + 0.0* step(0.71, endIslands));
    // };

    if(max(max_depth, max(clamp(clouds_depth, 0.0, 0.999), clamp(weather_depth, 0.0, 0.999))) == 1.0) {

        main_color.rgb = getSkyColorDetailed(viewDir, minViewSpacePos);

        vec3 ambientLightColor = vec3(0.0);
        ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        // for(int i = 0; i < 2; i++) {
        //     for(int j = 0; j < 2; j++) {
        //         float totalSamples = 4.0;
        //         vec3 skySample = getSkyColor(normalize(rand3D(vec2(i, j))));

        //         ambientLightColor += skySample / totalSamples;
        //     }
        // }
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);
        vec3 skyLightColor = mix(normalize(getSkyColor(normalize(frx_skyLightVector - vec3(0.0, 0., 0.0)))), normalize(vec3(5.0, 1.75, 0.5)), 1.0 - frx_skyLightTransitionFactor) * (skyIlluminance / 1.5);

        vec3 viewPos = maxViewSpacePos;


        if(viewDir.y > 0.0) {
            // viewPos.y = abs(viewPos.y);
            // vec2 starPlane = viewPos.xz / (viewPos.y + 0.5 * length(viewPos.xz));
            // starPlane *= 200.0;
            // viewPos.y = maxViewSpacePos.y;


            // vec3 stars = vec3(step(1.0 - 1e-2, rand1D(floor(starPlane)))) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);
            // stars = (stars) * normalize(rand3D(floor(starPlane)) * 0.3 + 0.7);

            // main_color.rgb = mix(main_color.rgb + stars, main_color.rgb, clamp01(max(skyIlluminance * 2.0, frx_luminance(stars))));


            if(frx_worldIsOverworld == 1) {
                vec2 plane = viewPos.xz / (viewPos.y + 0.1 * length(viewPos.xz));
                plane += frx_renderSeconds / 100.0;

                vec2 cirrusPlane = plane;

                #ifdef CURL_NOISE
                    plane += 0.0045 * curlNoise(plane * 4.0 + frx_renderSeconds / 20.0);
                #endif


                float LdotV = clamp01(dot(frx_skyLightVector, viewDir));
                float nLdotV = clamp01(dot(-frx_skyLightVector, viewDir)) * (1.0 - frx_skyLightTransitionFactor);
                vec3 mie = max(1.0, miePhase(LdotV, 10.0) + miePhase(nLdotV, 10.0)) * skyLightColor;

                float cirrusClouds = sampleCirrusCloud(cirrusPlane + 10.0 + 0.3 * vec2(smoothHash(cirrusPlane), 0.0), 3) * (4.0 / 3.0);
                float transmittanceCirrus = exp2(-cirrusClouds * 4.0);
                vec3 scatteringCirrus = (1.0 - transmittanceCirrus) * mie;

                main_color.rgb = mix(main_color.rgb, main_color.rgb * transmittanceCirrus + scatteringCirrus, smoothstep(0.0, 0.1, viewDir.y));

                vec3 clouds;
                float cloudDensity;
                float cloudCoverage;

                cloudCoverage = sampleCumulusCloud(plane, CLOUD_DETAIL);

                vec2 planeMarch = plane;
                float stepLength = 1.0 / 8.0;

                vec3 skyLightVector = mix(frx_skyLightVector, vec3(0.0, 1.0, 0.0), 1.0 - frx_skyLightTransitionFactor);

                vec2 rayDirection = normalize(skyLightVector.xz / skyLightVector.y - viewDir.xz / viewDir.y) / 3.0;
                rayDirection = mix(rayDirection, -rayDirection, 1.0 - frx_skyLightTransitionFactor);
                float opticalDepth;
                float lightOpticalDepth;

                float transmittance = 1.0;
                //vec3 scattering;
                for(int i = 0; i < 3; i++) {
                    planeMarch += rayDirection * stepLength;

                    float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_SHADING_DETAIL) * (CLOUD_SHADING_DETAIL + 1.0 / CLOUD_SHADING_DETAIL);
                    //if(currentDensity == 0.0) break;

                    lightOpticalDepth += currentDensity / 8.0;

                    //if(currentDensity < 0.00001) break;

                    stepLength *= 1.5;
                }

                //lightOpticalDepth = mix(lightOpticalDepth, 0.25, 1.0 - frx_skyLightTransitionFactor);


                opticalDepth = cloudCoverage;

                transmittance = exp2(-opticalDepth * 4.0);
                vec3 scattering = vec3(exp2(-lightOpticalDepth * 2.0) * (1.0 - transmittance)) * mie;
                main_color.rgb = mix(main_color.rgb, main_color.rgb * transmittance + scattering, smoothstep(0.0, 0.1, viewDir.y));
            }

            main_color.rgb += rand1D(texcoord * 2000.0) / 555.0;
        }
    } else if(pbrData.g > 0.5) {
        translucent_color.rgb *= vec3(1.0, 1.3, 0.7);
        float sunDotU = dot(getSunVector(), vec3(0.0, 1.0, 0.0));

        float waterFogDistance = distance(minViewSpacePos, maxViewSpacePos);

        vec3 waterFogColor = vec3(0.0, 0.16, 0.09)  * max(0.25, sunDotU);
        //vec3 waterFogColor = translucent_color.rgb / vec3(frx_luminance(translucent_color.rgb));
        waterFogColor *= (clamp01(sunDotU) * 0.9  + 0.1) * (frx_smoothedEyeBrightness.y * 0.95 + 0.05);
        
        float fogDensity = 1.0 - exp2(-waterFogDistance * 2.0);

        translucent_color.rgb = mix(translucent_color.rgb, waterFogColor, fogDensity);
        translucent_color.a = mix(translucent_color.a, 0.9, fogDensity);
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
    if(clouds_depth < max_depth) color_layers[0].rgb = mix(color_layers[0].rgb, clouds_color.rgb, clouds_color.a);

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
            #define SSR_STEPS 60
            vec3 screenPos = vec3(texcoord, min_depth);

            vec3 viewSpaceReflectionDir = reflect(viewDir, normal);
            vec3 screenSpaceReflectionDir = normalize(viewSpaceToScreenSpace(minViewSpacePos + viewSpaceReflectionDir) - screenPos);

            float stepLength = 0.5 / SSR_STEPS;

            vec3 reflectColor = max(vec3(0.005), getSkyColorDetailed(viewSpaceReflectionDir, reflect(minViewSpacePos, normal)) * clamp01(frx_worldIsEnd + frx_smoothedEyeBrightness.y));
            
            vec3 reflectance = vec3(0.0);

            if(frx_worldIsEnd != 1) {
                if(frx_luminance(reflectColor.rgb) > 5.5) reflectance = vec3(0.5);

                for(int i = 0; i < SSR_STEPS; i++) {
                    screenPos += screenSpaceReflectionDir * stepLength
                    * mix(1.0, rand1D(mod(texcoord + i, 40.0) * 2000.0), max(0.3, 1.0 - SSR_STEPS / 60.0));


                    if(clamp01(screenPos.xy) != screenPos.xy) {
                        break;
                    } else {
                        float depthQuery = texture(u_particles_depth, screenPos.xy).r;

                        if(screenPos.z > depthQuery && depthQuery != 1.0) {
                            reflectColor = texture(u_previous_frame, screenPos.xy).rgb;
                            break;
                        }
                    }
                    stepLength *= 1.06;
                }
            }

            if(reflectance.r == 0.0) reflectance = getReflectance(f0, clamp01(dot(normal, -viewDir)));

            composite = mix(composite, reflectColor, reflectance);
            //composite = normal;
        }

        #ifdef RTAO
            const int RTAO_RAYS = 1;
            const int RTAO_STEPS = 10;

            vec3 rayView = jitterPos;
            vec3 rayDir = normalize(normal);
            float stepLength = 0.5 / RTAO_STEPS;

            for(int rays = 0; rays < RTAO_RAYS; rays++) {
                for(int i = 0; i < 10; i++) {
                    rayView += normalize(rayDir + rand3D(mod(jitterCoord * 2000.0 + frx_renderFrames + 20.0 * rays + i, 4000.0))) * stepLength
                    * (rand1D(jitterCoord * 2000.0 + frx_renderFrames + rays + i) * 0.5 + 0.5);

                    vec3 rayScreen = viewSpaceToScreenSpace(rayView);

                    if(clamp01(rayScreen) != rayScreen) {
                        break;
                    } else {
                        float depthQuery = texture(u_translucent_depth, rayScreen.xy).r;

                        if(rayScreen.z > depthQuery && distance(rayView, setupViewSpacePos(rayScreen.xy, depthQuery)) < 1.0) {
                            rtao *= 0.25 / RTAO_RAYS;
                            break;
                        }
                    }

                    stepLength *= 1.3;
                }
            }
            composite *= mix(lastFrameRtao, rtao, RTAO_BLEND_FACTOR);
        #endif

        float blockDist = length(minViewSpacePos);
        float sunDotU = getSunVector().y;

        #ifdef ATMOSPHERIC_FOG
            if(frx_worldIsOverworld == 1) {
                float fogDist = blockDist;
                if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
                fogDist /= 256.0;

                float fogOpticalDepth = 500000.0;

                float fogTransmittance = exp(-fogDist * (0.15 + 0.3 * (1.0 - frx_smoothedEyeBrightness.y - frx_worldIsEnd) + 30.0 * frx_cameraInFluid));

                vec3 fogScattering = getFogScattering(viewDir, fogOpticalDepth);
                fogScattering = mix(fogScattering, mix(vec3(0.05, 0.1, 0.2), vec3(0.2, 0.0, 0.0), smoothstep(0.0, -10.0, frx_cameraPos.y)), 1.0 - frx_smoothedEyeBrightness.y);
                fogScattering = mix(fogScattering, vec3(0.0, 0.5, 0.4) * max(0.1, sunDotU), frx_cameraInWater);

                fogScattering *= (1.0 - fogTransmittance);

                composite = composite * fogTransmittance + fogScattering;
            }
        #endif

        #ifdef BORDER_FOG
            composite = mix(composite, skyColor, smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, blockDist));
        #endif

        composite = mix(composite, vec3(0.0), (smoothstep(0.0, 60.0 * frx_darknessEffectFactor, blockDist)) * frx_effectDarkness);
    }

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));

    #ifdef RTAO
        float alpha = frx_luminance(mix(lastFrameRtao, rtao, RTAO_BLEND_FACTOR));
    #else
        float alpha = 1.0;
    #endif


    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, alpha));
}
