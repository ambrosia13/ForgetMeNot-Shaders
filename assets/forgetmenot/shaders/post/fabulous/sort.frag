#define INCLUDE_SPACES
#define INCLUDE_PACKING
#define INCLUDE_PBR
#define INCLUDE_NOISE
#define INCLUDE_IGN
#define INCLUDE_LDEPTH
#define INCLUDE_RAYTRACER
#define INCLUDE_SKY
#define INCLUDE_CUBEMAPS
#include forgetmenot:shaders/lib/includes.glsl 

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

uniform sampler2D u_previous_color;
uniform samplerCube u_skybox;
uniform usampler2D u_data;
uniform sampler2D u_depths;

uniform sampler2D u_sky_lut;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

// this is the exact same as vanilla fabulous blending

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

void main() {
    init();
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // sample things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    vec4 translucent_color = texture(u_translucent_color, texcoord.xy);
    float translucent_depth = texture(u_translucent_depth, texcoord).r;

    vec4 main_color = texture(u_main_color, texcoord);
    float main_depth = texture(u_main_depth, texcoord).r;
    
    vec4 entity_color = texture(u_entity_color, texcoord);
    float entity_depth = texture(u_entity_depth, texcoord).r;

    vec4 weather_color = texture(u_weather_color, texcoord);
    weather_color.rgb = pow(weather_color.rgb, vec3(2.2));
    float weather_depth = texture(u_weather_depth, texcoord).r;

    vec4 clouds_color = texture(u_clouds_color, texcoord);
    clouds_color.rgb = pow(clouds_color.rgb, vec3(2.2));
    float clouds_depth = texture(u_clouds_depth, texcoord).r;

    vec4 particles_color = texture(u_particles_color, texcoord);
    float particles_depth = texture(u_particles_depth, texcoord).r;

    uvec3 samplePacked = texture(u_data, texcoord).xyz;

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 maxSceneSpacePos = setupSceneSpacePos(texcoord, max_depth);
    vec3 minSceneSpacePos = setupSceneSpacePos(texcoord, min_depth);

    vec3 viewDir = getViewDir();
    vec3 tdata = getTimeOfDayFactors();

    vec4 unpackedX, unpackedY, unpackedZ;
    unpackedX = unpackUnormArb(samplePacked.x, BITS_X);
    unpackedY = unpackUnormArb(samplePacked.y, BITS_Y);
    unpackedZ = unpackUnormArb(samplePacked.z, BITS_Z);

    vec3 normal = normalize(clamp01(unpackedX.xyz) * 2.0 - 1.0);//normalize(cross(dFdx(sceneSpacePos), dFdy(sceneSpacePos)));

    float blockLight = unpackedY.x * unpackedY.x;
    float skyLight = unpackedY.y;
    float vanillaAo = unpackedY.z * unpackedY.z;

    float f0 = unpackedZ.x * unpackedZ.x;
    float roughness = unpackedZ.y * unpackedZ.y;
    float sssAmount = unpackedZ.z;

    float disableDiffuse = step(0.5, unpackedY.w);
    float isWater = step(0.5, unpackedX.w);

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // Disable fabulous blending for water
    translucent_color.a = mix(translucent_color.a, 0.0, step(0.5, isWater));

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // fabulous blending same as mojang (mostly)
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    
    color_layers[0] = main_color;
    depth_layers[0] = main_depth;
    active_layers = 1;

    // translucent_color.a = mix(translucent_color.a, 1.0, step(0.001, translucent_color.a));
    try_insert(translucent_color, translucent_depth);
    try_insert(entity_color, entity_depth);
    try_insert(weather_color, weather_depth);
    try_insert(particles_color, particles_depth);
    //try_insert(clouds_color, clouds_depth);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // other stuff
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    if(isWater > 0.5 || frx_cameraInWater == 1) {
        //composite *= 0.5;

        // These should eventually be configurable
        const float WATER_DIRT_AMOUNT = 0.1;
        const vec3 WATER_COLOR = vec3(0.0, 0.20, 0.25);

        float waterFogDistance = mix(distance(maxSceneSpacePos, minSceneSpacePos), length(minSceneSpacePos * 0.1), float(frx_cameraInWater));
        waterFogDistance = max(waterFogDistance, 0.01);

        float sunLightFactor = linearstep(0.0, 0.2, frx_skyLightVector.y);

        vec3 underwaterFogColor = WATER_COLOR * sunLightFactor;
        underwaterFogColor *= (1.0 + 3.0 * getMiePhase(dot(viewDir, frx_skyLightVector), 0.75) * sunLightFactor);
        underwaterFogColor = max(underwaterFogColor, vec3(0.01));

        vec3 waterFogColor = mix(translucent_color.rgb, underwaterFogColor, frx_cameraInWater);

        // Water absorption
        composite *= mix(fNormalize(waterFogColor), vec3(0.5), exp(-waterFogDistance * mix(0.5, 1.0, float(frx_cameraInWater))));
        
        // Water scattering
        composite = mix(waterFogColor, composite, exp(-waterFogDistance * (WATER_DIRT_AMOUNT + 0.4 * frx_cameraInWater)) * 0.99 + 0.01);
    }

    if(min_depth < 1.0 && roughness < 1.0) {
        vec3 viewSpacePos = setupViewSpacePos(texcoord, min_depth);

        vec3 reflectColor = vec3(0.0);
        vec3 reflectance = getReflectance(vec3(f0), clamp01(dot(-normal, viewDir)), roughness);

        vec3 cleanReflectDir = reflect(viewDir, normal);
        vec3 reflectDir = generateCosineVector(cleanReflectDir, roughness);
        
        vec3 hitPos;
        bool hit = false;

        if(roughness < 0.5) {
            vec3 pos_ws = vec3(gl_FragCoord.xy, min_depth);
            vec3 dir_ws = normalize(
                (
                    viewSpaceToScreenSpace(viewSpacePos + frx_normalModelMatrix * reflectDir) -
                    vec3(texcoord, min_depth)
                ) * vec3(frxu_size, 1.0)
            );

            hit = raytrace(
                pos_ws,
                dir_ws,
                40,
                u_depths,
                hitPos
            );

            // Reflection reprojection
            vec3 hitPosScene = setupSceneSpacePos(hitPos);
            hitPos = lastFrameSceneSpaceToScreenSpace(hitPosScene);
        }
        
        if(hit) {
            reflectColor = texelFetch(u_previous_color, ivec2(hitPos.xy * frxu_size), 0).rgb;
        } else {
            vec4 skybox = textureLod(u_skybox, cleanReflectDir, 9.0 / inversesqrt(roughness));

            reflectColor = skybox.rgb * skyLight;
        }

        composite *= mix(vec3(1.0), reflectColor, step(0.999, f0));
        composite = mix(composite, reflectColor, reflectance * step(f0, 0.999));
    }

    {
        if(min_depth < 1.0 && frx_cameraInWater == 0) {
            // vec3 fogScattering = raymarchScattering(skyViewPos, viewDir, getSunVector(), length(minSceneSpacePos) * 0.001, float(numScatteringSteps), u_transmittance, u_multiscattering) * 20.0;
            // fogScattering += moonFlux * raymarchScattering(skyViewPos, viewDir, getMoonVector(), length(minSceneSpacePos) * 0.001, float(numScatteringSteps), u_transmittance, u_multiscattering) * 20.0;
            float blockDistance = rcp(inversesqrt(dot(minSceneSpacePos, minSceneSpacePos)));

            float fogDensity = 0.001;
            fogDensity = mix(fogDensity, 0.003, linearstep(0.5, 0.0, frx_skyLightVector.y));

            float fogTransmittance = exp2(-blockDistance * fogDensity);
            // vec3 fogScattering = getValFromSkyLUT;


            //composite = mix(fogScattering, composite, fogTransmittance);
        }
    }

    {
        // cloud fade into distance
        // I always hated how horrible the cloud fog looks in vanilla
        vec3 cloudPos = setupSceneSpacePos(texcoord, clouds_depth);
        clouds_color.a = mix(clouds_color.a, 0.0, frx_smootherstep(192.0, 320.0, length(cloudPos.xz)));

        // Blend clouds in at the end
        composite.rgb = mix(composite.rgb, clouds_color.rgb, clouds_color.a * step(clouds_depth - min_depth, 0.0));
    }

    fragColor = composite.rgbb * FMN_MASK.xxxy + FMN_MASK.yyyx;
}
