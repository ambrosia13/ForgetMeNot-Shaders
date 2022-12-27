#define INCLUDE_SPACES
#define INCLUDE_PACKING
#define INCLUDE_PBR
#define INCLUDE_NOISE
#define INCLUDE_IGN
#define INCLUDE_LDEPTH
#define INCLUDE_RAYTRACER
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
uniform sampler2D u_data;
uniform sampler2D u_depths;

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

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // common things
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    float max_depth = max(max(translucent_depth, particles_depth), main_depth);
    float min_depth = min(min(translucent_depth, particles_depth), main_depth);

    vec3 viewDir = getViewDir();

    // see utility.glsl
    // vec3(dayFactor, nightFactor, sunsetFactor)
    vec3 tdata = getTimeOfDayFactors();

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // pre fabulous blending
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // cloud fade into distance
    // I always hated how horrible the cloud fog looks in vanilla
    vec3 cloudPos = setupSceneSpacePos(texcoord, clouds_depth);
    clouds_color.a = mix(clouds_color.a, 0.0, frx_smootherstep(192.0, 320.0, length(cloudPos.xz)));

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
    //try_insert(clouds_color, clouds_depth);

    vec3 composite = color_layers[0].rgb;
    for (int ii = 1; ii < active_layers; ++ii) {
        composite = blend(composite, color_layers[ii]);
    }

    if(clouds_depth < min_depth) composite.rgb = mix(composite.rgb, clouds_color.rgb, clouds_color.a);

    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // other stuff
    // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

    if(min_depth < 1.0) {
        uvec3 samplePacked = floatBitsToUint(texture(u_data, texcoord).xyz);
        vec4 unpackedX, unpackedY, unpackedZ;
        unpackedX = unpackUnormArb(samplePacked.x, BITS_X);
        unpackedY = unpackUnormArb(samplePacked.y, BITS_Y);
        unpackedZ = unpackUnormArb(samplePacked.z, BITS_Z);

        vec3 normal = normalize(unpackedX.xyz * 2.0 - 1.0);

        float blockLight = unpackedY.x * unpackedY.x;
        float skyLight = unpackedY.y;
        float vanillaAo = unpackedY.z * unpackedY.z;

        float f0 = unpackedZ.x * unpackedZ.x;
        float roughness = unpackedZ.y * unpackedZ.y;
        float sssAmount = (unpackedX.w - 0.02) * (1.02 / 1.0);

        float disableDiffuse = step(0.5, unpackedY.w);
        float matCutout = step(0.5, unpackedZ.z);


        vec3 viewSpacePos = setupViewSpacePos(texcoord, min_depth);


        vec3 reflectColor = vec3(0.0);
        vec3 reflectDir = reflect(viewDir, normal);
        vec3 hitPos;
        bool hit = false;

        if(roughness < 0.5) {
            hit = raytrace(viewSpacePos, frx_normalModelMatrix * reflectDir, 40, u_translucent_depth, hitPos);
        }
        
        if(hit) {
            reflectColor = texture(u_previous_color, hitPos.xy).rgb;
        } else {
            reflectColor = textureLod(u_skybox, reflectDir, 9.0 * roughness).rgb;
        }


        composite = mix(composite, reflectColor, getReflectance(vec3(f0), clamp01(dot(-normal, viewDir)), roughness));
        //composite = normal;
    }

    fragColor = max(vec4(1.0 / 65536.0), vec4(composite, 1.0));
}
