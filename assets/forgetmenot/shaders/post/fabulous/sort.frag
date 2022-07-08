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
    float d = fbmHash(plane * vec2(15.0, 3.0) + 17.0, octaves) * smoothstep(0.4, 1.5, fbmHash(plane * 0.3, octaves, 0.01));
    return d;
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

    // sky to linear
    if(max(max_depth, max(clamp(clouds_depth, 0.0, 0.999), clamp(weather_depth, 0.0, 0.999))) == 1.0) {
        main_color.rgb = getSkyColor(viewDir);

        vec3 ambientLightColor = vec3(0.0);
        for(int i = 0; i < 2; i++) {
            for(int j = 0; j < 2; j++) {
                float totalSamples = 4.0;
                vec3 skySample = getSkyColor(normalize(rand3D(vec2(i, j))));

                ambientLightColor += skySample / totalSamples;
            }
        }
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);

        vec3 viewPos = maxViewSpacePos;


        if(viewDir.y > 0.0) {
            viewPos.y = abs(viewPos.y);
            vec2 starPlane = viewPos.xz / (viewPos.y + 0.5 * length(viewPos.xz));
            starPlane *= 200.0;
            viewPos.y = maxViewSpacePos.y;


            vec3 stars = vec3(step(1.0 - 1e-2, rand1D(floor(starPlane)))) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);
            stars = (stars) * normalize(rand3D(floor(starPlane)) * 0.4 + 0.6);

            main_color.rgb = mix(main_color.rgb + stars, main_color.rgb, clamp01(max(skyIlluminance * 2.0, frx_luminance(stars))));

            vec2 plane = viewPos.xz / (viewPos.y + 0.1 * length(viewPos.xz));
            plane += frx_renderSeconds / 100.0;
            vec2 cirrusPlane = plane;
            plane += 0.0025 * curlNoise(plane * 4.0);
            //plane *= 0.5;
            //plane *= vec2(1.3, 1.0);
            //plane *= 2.0;

            vec3 skyLightColor = mix(normalize(getSkyColor(frx_skyLightVector)), normalize(vec3(5.0, 1.75, 0.5)), 1.0 - frx_skyLightTransitionFactor) * (skyIlluminance / 1.5);

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
            for(int i = 0; i < 4; i++) {
                planeMarch += rayDirection * stepLength;

                float currentDensity = sampleCumulusCloud(planeMarch, CLOUD_SHADING_DETAIL);
                if(currentDensity == 0.0) break;

                lightOpticalDepth += currentDensity / 8.0;

                //if(currentDensity < 0.00001) break;

                stepLength *= 1.1;
            }

            //lightOpticalDepth = mix(lightOpticalDepth, 0.25, 1.0 - frx_skyLightTransitionFactor);


            opticalDepth = cloudCoverage;

            transmittance = exp2(-opticalDepth * 4.0);
            vec3 scattering = vec3(exp2(-lightOpticalDepth * 6.0) * (1.0 - transmittance)) * mie;
            main_color.rgb = mix(main_color.rgb, main_color.rgb * transmittance + scattering, smoothstep(0.0, 0.1, viewDir.y));

            main_color.rgb += rand1D(texcoord * 2000.0) / 555.0;
        }
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

    if(min_depth < 1.0) {

    }

    // composite = vec3(getCloudNoise(minViewSpacePos.xz / minViewSpacePos.y, 0.5));
    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, 1.0));
}
