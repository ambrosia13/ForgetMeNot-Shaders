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
uniform sampler2D u_depth_mipmaps;
uniform sampler2D u_blue_noise;
uniform sampler2D u_global_illumination_copy;
uniform sampler2D u_success_dir_copy;
uniform sampler2D u_processed_color;

uniform sampler2DArrayShadow u_shadow_map;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 globalIllumination;
layout(location = 2) out vec4 successDir;
layout(location = 3) out vec4 finalGI;

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

    coverageBias = clamp(coverageBias, 0.3, 0.7);

    coverageBias = mix(coverageBias, 0.35, frx_smoothedRainGradient);
    coverageBias = mix(coverageBias, 0.2, frx_smoothedThunderGradient);
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
    float clouds = fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.5, 1.5, fbmHash(plane * 0.5, octaves, 0.01));
    return clouds;
}
float getVLFogDensity(in vec3 pos) {
    pos += frx_cameraPos;
    float h = smoothstep(0.0, 250.0, pos.y);
    // h = 0.0;
    return smoothstep(0.0 + h, 1.0, fbm(pos * 0.9));
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

// Offsets from Chocapic13 shaders
vec2 taaOffsets[8] = vec2[8](
    vec2( 0.125,-0.375),
    vec2(-0.125, 0.375),
    vec2( 0.625, 0.125),
    vec2( 0.375,-0.625),
    vec2(-0.625, 0.625),
    vec2(-0.875,-0.125),
    vec2( 0.375,-0.875),
    vec2( 0.875, 0.875)
);

vec3 getBlueNoise() {
    ivec2 coord = ivec2(gl_FragCoord.xy + 1u * frx_renderFrames * 500u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return normalize(r) * 2.0 - 1.0;
}
vec3 getBlueNoise(float offset) {
    ivec2 coord = ivec2(rotate2D(texcoord, offset) * frxu_size + frx_renderFrames * 500u);
    vec3 r = texelFetch(u_blue_noise, coord % 256, 0).rgb;
    
    return normalize(r) * 2.0 - 1.0;
}

void main() {
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    vec4 pbrData = texture(u_pbr_data, texcoord).rgba;
    vec3 f0 = pbrData.rrr;
    float roughness = pbrData.b;

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

    vec4  particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;

    vec3 coords = vec3(texcoord, 0.0);
    #ifdef REFRACTION
    vec3 rview = setupCleanViewSpacePos(texcoord, translucent_depth);
    rview = normalize(rview);

    if(translucent_depth != max(particles_depth, translucent_depth)) {
        vec3 rd = refract(rview, normal, 0.99);
        coords = cleanViewSpaceToScreenSpace(rd).xyz;

        if(clamp01(coords.xy) != coords.xy) coords.xy = texcoord;
        // main_color.rgb = texture(u_main_color, coords.xy).rgb;
    }
    #endif

    translucent_depth = texture(u_translucent_depth, coords.xy).r;
    particles_depth = texture(u_particles_depth, coords.xy).r;


    vec4  main_color = texture(u_main_color, coords.xy);
    float main_depth = texture(u_main_depth, coords.xy).r;
    
    vec4  entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4  weather_color = texture(u_weather_color, texcoord);
    weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
    float weather_depth = texture(u_weather_depth, texcoord).r;

    vec4  clouds_color = texture(u_clouds_color, texcoord);
    clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));
    float clouds_depth = texture(u_clouds_depth, texcoord).r;



    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 maxViewSpacePos = setupViewSpacePos(texcoord, max_depth);
    vec3 minViewSpacePos = setupViewSpacePos(texcoord, min_depth);
    vec3 viewDir = normalize(setupViewSpacePos(texcoord, 1.0));

    vec3 tdata = getTimeOfDayFactors();

    vec3 sunVector = getSunVector();
    vec3 moonVector = getMoonVector();

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec2 jitterCoord = texcoord + taaOffsets[frx_renderFrames % 8u] / frxu_size;

    vec3 jitterPos = setupViewSpacePos(jitterCoord, min_depth);
    vec3 positionDifference = frx_cameraPos - frx_lastCameraPos;
    vec3 lastScreenPos = lastFrameViewSpaceToScreenSpace(minViewSpacePos + positionDifference);

#define SSGI

    #if defined RTAO || defined SSGI 
        const float RTAO_BLEND_FACTOR = 0.05;
        vec3 rtao = vec3(1.0);
        vec3 ssgi = vec3(0.0);
        float hit = 0.0;
        vec3 success;
        vec3 lastFrameSuccess;

        vec4 lastFrameSample = vec4(1.0);
        if(clamp01(lastScreenPos.xy) == lastScreenPos.xy) lastFrameSample = texture(u_global_illumination_copy, lastScreenPos.xy);
        if(clamp01(lastScreenPos.xy) == lastScreenPos.xy) lastFrameSuccess = texture(u_success_dir_copy, lastScreenPos.xy).rgb;
        vec3 lastFrameRtao = lastFrameSample.aaa;
        float lastFrameHit = lastFrameSample.a;
    #endif

    if(max_depth < 1.0) {
        #ifdef SSGI
            const int SSGI_BOUNCES = 1;
            const int SSGI_STEPS = 100;

            vec3 finalSSGICoords;
            bool ssgiHit = false;

            vec3 ssgiNormal = normal;

            for(int b = 0; b < SSGI_BOUNCES; b++) {
                vec3 rayPos = minViewSpacePos;
                vec3 rayDir = normalize(ssgiNormal + roughness * normalize(goldNoise3d()));
                //success = normalize(rayDir + noise3d(1.0) * 0.25);
                float stepLength = 1.0 / SSGI_STEPS;

                vec3 rayScreen = vec3(texcoord, min_depth);

                vec3 screenDir = normalize(viewSpaceToScreenSpace(rayPos + rayDir) - rayScreen);

                // vec3 signDir = (sign(rayDir) - rayScreen) / rayDir;
                //vec3 bn = getBlueNoise(frx_renderFrames & 50u);

                for(int i = 0; i < SSGI_STEPS; i++) {
                    if(false) {
                        rayPos += normalize(normal + normalize(noise3d())) * interleaved_gradient(i);

                        rayScreen = viewSpaceToScreenSpace(rayPos);
                    } else {
                        rayScreen += screenDir * interleaved_gradient(i) * stepLength;
                    }

                    if(clamp01(rayScreen) != rayScreen) {
                        break;
                    } else {
                        float depthQuery = textureLod(u_depth_mipmaps, rayScreen.xy, 0).r;

                        if(rayScreen.z > depthQuery && abs(linearizeDepth(rayScreen.z) - linearizeDepth(depthQuery)) < 0.05) {
                            finalSSGICoords = rayScreen;
                            ssgiHit = true;
                            break;
                        }
                    }

                    stepLength *= 1.0;
                }

                // float binaryStepLength = 1.0 / SSGI_STEPS;
                // for(int i = 0; i < 0; i++) {
                //     finalSSGICoords += sign(textureLod(u_depth_mipmaps, finalSSGICoords.xy, 0).r - finalSSGICoords.z) * screenDir * binaryStepLength;
                //     binaryStepLength *= 0.5;
                // }

                vec3 ssgiViewPos = setupViewSpacePos(finalSSGICoords.xy, finalSSGICoords.z);
                finalSSGICoords = lastFrameViewSpaceToScreenSpace(ssgiViewPos + frx_cameraPos - frx_lastCameraPos); 

                if(true) {
                    if(ssgiHit) {
                        vec3 emission = textureLod(u_previous_frame, finalSSGICoords.xy, 0).rgb;

                        ssgi += emission * exp2(-b);
                        hit = 1.0;
                        success *= tanh(frx_luminance(emission));
                    } else {
                        ssgi += getSkyColor(rayDir) * smoothstep(0.1, 0.2, frx_eyeBrightness.y);
                    }
                }

                ssgi = mix(ssgi, vec3(1.0), clamp01(main_color.a));

                ssgiNormal = texture(u_normal, finalSSGICoords.xy).rgb * 2.0 - 1.0;
            }

            ssgi = mix(ssgi, lastFrameSample.rgb, 0.999 * (1.0 - step(0.0001, (1.0 - frx_playerSpectator) + distance(frx_cameraPos, frx_lastCameraPos))));
            if(f0.r < 0.99) main_color *= vec4(ssgi, 1.0);

        #endif
    }


    vec3 skyColor = getSkyColor(viewDir);
    if(smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, length(maxViewSpacePos)) > 0.0) {
        vec2 clipPos = texcoord * 2.0 - 1.0;
        clipPos += taaOffsets[frx_renderFrames % 8u] / (frxu_size);
        vec2 newTexcoordJittered = clipPos * 0.5 + 0.5;
        vec3 jitteredViewPos = setupViewSpacePos(newTexcoordJittered, 1.0);
        vec3 jitteredViewDir = normalize(jitteredViewPos);

        skyColor = getSkyColorDetailed(jitteredViewDir, minViewSpacePos);

        vec3 ambientLightColor = vec3(0.0);
        ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);
        vec3 skyLightColor = mix(normalize(getSkyColor(normalize(frx_skyLightVector - vec3(0.0, 0., 0.0)))), normalize(vec3(7.0, 1.75, 0.5)), 1.0 - frx_skyLightTransitionFactor) * (skyIlluminance);
        //vec3 skyLightColor = normalize(getCloudsScattering(frx_skyLightVector)) * skyIlluminance;
        //skyLightColor = mix(skyLightColor, skyLightColor * 0.25 + 0.75, 1.0) * skyIlluminance;
        skyLightColor *= mix(vec3(1.0), vec3(0.2, 0.5, 2.0), (1.0 - frx_skyLightTransitionFactor) * smoothstep(-0.5, 0.5, dot(viewDir, getMoonVector())));
        vec3 viewPos = maxViewSpacePos;

        #define CLOUDS
        #ifdef CLOUDS
            if(viewDir.y > 0.0) {
                if(frx_worldIsOverworld == 1) {
                    vec2 plane = viewPos.xz / (viewPos.y + 0.1 * length(viewPos.xz));
                    plane *= 1.15;

                    plane += frx_cameraPos.xz / 150.0;

                    #ifdef CURL_NOISE
                        plane += 0.001 * curlNoise(plane * 6.0 + fmn_time / 20.0);
                        //plane += 0.0045 * fbmCurl(plane * 6.0 + fmn_time / 20.0, 10);
                    #endif

                    plane += fmn_time / 100.0;

                    vec2 cirrusPlane = (plane - frx_cameraPos.xz / 150.0) + frx_cameraPos.xz / 1000.0;



                    float LdotV = clamp01(dot(frx_skyLightVector, viewDir));
                    float nLdotV = clamp01(dot(-frx_skyLightVector, viewDir)) * (1.0 - frx_skyLightTransitionFactor);

                    float cloudsG = 0.8;
                    float phaseMie = max(0.0, henyeyGreenstein(LdotV, atmosphereG) + henyeyGreenstein(nLdotV, atmosphereG));

                    vec3 mie = mix(phaseMie, 1.0, smoothstep(1.9, 0.1, phaseMie)) * skyLightColor;

                    float cirrusClouds = sampleCirrusCloud(cirrusPlane + 10.0 + 0.3 * vec2(smoothHash(cirrusPlane), 0.0), 3) * (4.0 / 3.0);
                    float transmittanceCirrus = exp2(-cirrusClouds * 4.0);
                    vec3 scatteringCirrus = (1.0 - transmittanceCirrus) * mie;

                    skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittanceCirrus + scatteringCirrus, smoothstep(0.0, 0.1, viewDir.y));

                    float cumulusCloudsDensity;
                    cumulusCloudsDensity = sampleCumulusCloud(plane, CLOUD_DETAIL);

                    vec2 planeMarch = plane;
                    float stepLength = 1.0;

                    vec3 skyLightVector = mix(frx_skyLightVector, vec3(0.0, 1.0, 0.0), (1.0 - frx_skyLightTransitionFactor));
                    vec2 rayDirection = normalize(skyLightVector.xz / skyLightVector.y - viewDir.xz / viewDir.y) / 2.0;
                    rayDirection *= mix(1.0, -1.0, 1.0 - frx_skyLightTransitionFactor);

                    float opticalDepth = cumulusCloudsDensity;
                    float lightOpticalDepth;

                    float transmittance = 1.0;
                    vec3 scattering;
                    for(int i = 0; i < 1; i++) {
                        planeMarch += rayDirection * stepLength * interleaved_gradient();


                        float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_DETAIL);
                        //if(currentDensity == 0.0) break;

                        lightOpticalDepth += currentDensity;

                        //if(currentDensity == 0.0) break;

                        //stepLength *= 1.5;
                    }

                    //lightOpticalDepth = mix(lightOpticalDepth, 0.5, 1.0 - frx_skyLightTransitionFactor);


                    // opticalDepth = cumulusCloudsDensity;
                    //lightOpticalDepth = lightOpticalDepth * (2.0 / 3.0) + opticalDepth * (1.0 / 3.0);
                    //lightOpticalDepth /= 2.0;

                    transmittance = exp2(-opticalDepth * mix(4.0, 16.0, smoothstep(0.8, 1.0, dot(viewDir, abs(frx_skyLightVector)))));
                    scattering = vec3(exp2(-lightOpticalDepth * (2.5 + 2.5 * frx_smoothedRainGradient)) * (1.0 - transmittance)) * mie;
                    //scattering = mix(scattering, vec3(0.1 * mie), 1.0 - frx_skyLightTransitionFactor);

                    skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittance + scattering, smoothstep(0.0, 0.05, viewDir.y));

                    #ifdef CLOUD_LIGHT_RAYS
                        float lightRaysOpticalDepth = 0.0;

                        rayDirection = normalize(frx_skyLightVector.xz / frx_skyLightVector.y - viewDir.xz / viewDir.y);

                        for(int i = 0; i < 1; i++) {
                            planeMarch += rayDirection * stepLength * 2.0 * interleaved_gradient();
                            float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_DETAIL);

                            //if(currentDensity > 0.5) break;

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

        if(max(max_depth, max(clamp(clouds_depth, 0.0, 0.999), clamp(weather_depth, 0.0, 0.999))) == 1.0) {
            main_color.rgb = skyColor.rgb;
        }
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

    if(pbrData.g > 0.5) {
        float sunDotU = getSunVector().y;

        float waterFogDistance = distance(minViewSpacePos, maxViewSpacePos); // warning: destroys underwater translucent visibility

        vec3 waterFogColor = vec3(0.0, 0.16, 0.09)  * max(0.25, sunDotU);
        //vec3 waterFogColor = translucent_color.rgb / vec3(frx_luminance(translucent_color.rgb));
        waterFogColor *= (clamp01(sunDotU) * 0.9  + 0.1) * (frx_smoothedEyeBrightness.y * 0.95 + 0.05);
        
        if(max_depth == 1.0) waterFogDistance *= 1000.0;
        float fogDensity = 1.0 - exp2(-waterFogDistance * 0.5);

        composite = mix(composite * mix(vec3(1.0), vec3(0.36, 1.0, 0.81), fogDensity), waterFogColor, fogDensity);
    }


    vec3 reflectColor;
    if(min_depth < 1.0) {
        if(true) {
            vec3 reflectionCoord;
            bool ssrHit = false;

            #define SSR_STEPS 64
            const int depthLod = 0;

            vec3 screenPos = vec3(texcoord, min_depth);

//rand3D((texcoord + frx_renderSeconds) * 2000.0)
            vec3 cosineDistribution = goldNoise3d();
            vec3 roughNormal = normalize(normal + normalize(cosineDistribution) * roughness * (interleaved_gradient()));

            vec3 viewSpaceReflectionDir = reflect(viewDir, roughNormal);
            vec3 screenSpaceReflectionDir = normalize(viewSpaceToScreenSpace(minViewSpacePos + viewSpaceReflectionDir) - screenPos);

            float stepLength = 1.0 / SSR_STEPS;

            reflectColor = mix(
                frx_smoothedEyeBrightness.y < -1.0 / 16.0 ? (getFogScattering(viewDir, 750000.0 - 500000.0 * frx_skyLightVector.y)) : vec3(0.00),
                getSkyColorDetailed(viewSpaceReflectionDir, reflect(minViewSpacePos, roughNormal)),
                clamp01(frx_worldIsEnd + frx_smoothedEyeBrightness.y)
            );
            
            vec3 reflectance = vec3(0.0);
            if(reflectance.r == 0.0) reflectance = getReflectance(f0, clamp01(dot(normal, -viewDir))) * smoothstep(-0.9, 0.0, f0.r);
            if(reflectance.r > 0.999) reflectance = vec3(1.0);

            if(frx_worldIsEnd != 1 || true) {
                if(frx_luminance(reflectColor.rgb) > 5.5) reflectance = vec3(0.5);

                for(int i = 0; i < SSR_STEPS; i++) {
                    screenPos += screenSpaceReflectionDir * stepLength * interleaved_gradient(i);

                    if(clamp01(screenPos.xy) != screenPos.xy) {
                        break;
                    } else {
                        float depthQuery = textureLod(u_depth_mipmaps, screenPos.xy, depthLod).r;
                        // float ldepth = linearizeDepth(screenPos.z), lsample = linearizeDepth(depthQuery);

                        if(depthQuery == 1.0) {
                            //stepLength = 2.0 / SSR_STEPS;
                            continue;
                        }

                        float lenience = max(abs((screenSpaceReflectionDir.z)) * 3.0, 0.02 / pow(length(minViewSpacePos), 2.0));

                        if(abs(lenience - (screenPos.z - depthQuery)) < lenience) {
                            //reflectColor = texture(u_previous_frame, screenPos.xy).rgb;
                            reflectionCoord = screenPos;
                            ssrHit = true;

                            break;
                        }
                    }
                    //stepLength *= 1.06;
                }

                // float binaryStepLength = 0.5 / SSR_STEPS;
                // for(int i = 0; i < 8; i++) {
                //     reflectionCoord += sign(textureLod(u_depth_mipmaps, reflectionCoord.xy, depthLod).r - reflectionCoord.z) * screenSpaceReflectionDir * binaryStepLength;
                //     binaryStepLength *= 0.5;
                // }

            }

            vec3 rView = setupViewSpacePos(reflectionCoord.xy, reflectionCoord.z);
            reflectionCoord = lastFrameViewSpaceToScreenSpace(rView + frx_cameraPos - frx_lastCameraPos);

            if(ssrHit) reflectColor = texture(u_previous_frame, reflectionCoord.xy).rgb;
            if(f0.r > 0.999) reflectColor *= (composite);

            reflectColor = mix(reflectColor.rgb, lastFrameSuccess.rgb, 0.999 * (1.0 - step(0.0001, (1.0 - frx_playerSpectator) + distance(frx_cameraPos, frx_lastCameraPos))));

            // if(frx_cameraInWater == 1 && acos(dot(normal, -viewDir)) * (180 / PI) > 60.0) {
            //     reflectance = vec3(1.0);

            //     if(!ssrHit) reflectColor = vec3(0.0, 0.5, 0.4) * max(0.1, frx_skyLightVector.y);
            // }

            composite = mix(composite, reflectColor, reflectance);
            //composite = normal;
        }
    }

    float blockDist = length(minViewSpacePos);
    float sunDotU = getSunVector().y;

    #ifdef ATMOSPHERIC_FOG
        if(frx_worldIsOverworld == 1) {
            #ifndef DEPRESSING_MODE
                float fogDist = blockDist;
                if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
                fogDist /= 256.0;

                float fogOpticalDepth = 750000.0 - 500000.0 * frx_skyLightVector.y;
                //fogOpticalDepth = fogDist * 3000000.0;
                float fogAmount = 0.3 - 0.25 * (1.0 - clamp01(frx_skyLightVector.y));
                fogAmount += 0.9 * smoothstep(0.0, -10.0, frx_cameraPos.y);
                fogAmount *= mix(1.0, 0.1, sqrt(sqrt(clamp01(getSunVector().y))));

                float fogTransmittance = exp(-fogDist * (fogAmount + 0.3 * (1.0 - frx_smoothedEyeBrightness.y - frx_worldIsEnd) + 30.0 * frx_cameraInFluid));
                //fogTransmittance = mix(0.0, fogTransmittance, step(0.5, texcoord.x));

                fogTransmittance = mix(fogTransmittance, 1.0, floor(min_depth));
                if(frx_cameraInFluid == 1 && min_depth == 1.0) fogTransmittance = 0.0;

                vec3 fogScattering = getFogScattering(viewDir, 750000);

                fogScattering *= (1.0 - fogTransmittance);

                composite = composite * fogTransmittance + fogScattering;
            #else
                vec3 vlPos = minViewSpacePos;
                vec3 traceDir = clamp(-(vlPos / 8) * interleaved_gradient(), vec3(-frx_viewDistance), vec3(frx_viewDistance));
                //if(min_depth == 1.0) traceDir = -normalize(vlPos) * frx_viewDistance;

                float opticalDepth = 0.0;
                float lightOpticalDepth = 0.0;
                
                opticalDepth = (1.0 - exp(-length(minViewSpacePos) / frx_viewDistance));
                opticalDepth *= opticalDepth * opticalDepth * opticalDepth;

                float df = opticalDepth;

                if(min_depth < 1.0) {
                    for(int i = 0; i < 8; i++) {
                        vlPos += traceDir;

                        opticalDepth += getVLFogDensity(vlPos) * (pow(df, 1.0 / (1.3 + getTimeOfDayFactors().y)));

                        // shadow
                        vec4 shadowViewPos = frx_shadowViewMatrix * vec4(vlPos, 1.0);
                        int cascade = selectShadowCascade(shadowViewPos);
                        vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
                        vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

                        float shadowFactor;
                        shadowFactor = (1.0 - texture(u_shadow_map, vec4(shadowScreenPos.xy, cascade, shadowScreenPos.z))) / 1.0;

                        lightOpticalDepth += 0.5 * shadowFactor;
                        // for(int j = 0; j < 4; j++) {
                        //     vlPos += frx_skyLightVector * interleaved_gradient() * 1.0;
                        //     lightOpticalDepth += 0.05 * (getVLFogDensity(vlPos));
                        // }
                    }
                } else {
                    //opticalDepth = 0.8 * smoothstep(0.0 + smoothstep(-0.1, 0.1, viewDir.y), 1.0, fbm(viewDir * 100.0, 4));
                    opticalDepth = 0.0;
                }


                float transmittance = exp(-opticalDepth * 1.0);
                vec3 scattering = exp(-lightOpticalDepth * 0.5) * normalize(getSkyColor((frx_skyLightVector))) * min(1.5, frx_luminance(getSkyColor(vec3(0.0, 1.0, 0.0))) * 24.0) * max(0.1, smoothstep(-0.5, 0.0, getSunVector().y));
                scattering *= (1.0 - transmittance);

                composite = composite * transmittance + scattering;
            #endif
        } else if(frx_worldIsNether == 1) {
            float fogDist = blockDist;
            if(frx_cameraInFluid == 0) fogDist = max(0.0, fogDist - 10.0);
            fogDist /= 64.0;

            float fogTransmittance = exp(-fogDist);
            vec3 fogScattering = pow(frx_fogColor.rgb * 2.0, vec3(2.2)) * (1.0 - fogTransmittance);

            composite = composite * fogTransmittance + fogScattering;
        }
    #endif

    #if defined BORDER_FOG
        if(min_depth < 1.0 && frx_cameraInFluid == 0) composite = mix(composite, skyColor, smoothstep(frx_viewDistance - 48.0, frx_viewDistance - 24.0, blockDist));
    #endif

    #ifdef frx_darknessEffectFactor
        float sinTime = sin(fmn_time);
        float timeFactor = sinTime * sinTime * sinTime * sinTime * sinTime * sinTime;
        float darknessFactor = max(0.0, (frx_darknessEffectFactor) * 0.75 + 0.25);
        composite = mix(composite, vec3(0.0), (smoothstep(0.0, 20.0 * darknessFactor, blockDist)) * frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
    #endif

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));

    #ifdef RTAO
        float alpha = frx_luminance(mix(lastFrameRtao, rtao, 0.05));
    #else
        float alpha = 1.0;
    #endif


    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, alpha));
    #ifdef SSGI
        globalIllumination = vec4(ssgi, hit);
        successDir = vec4(reflectColor, 1.0);
    #endif
}
