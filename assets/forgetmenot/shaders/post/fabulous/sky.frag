#include forgetmenot:shaders/lib/includes.glsl 

in vec2 texcoord;

layout(location = 0) out vec4 skyColor;

void main() {
    #if SKY_RESOLUTION == RESOLUTION_QUARTER
        #define RESOLUTION_SCALE 4.0
    #elif SKY_RESOLUTION == RESOLUTION_HALF
        #define RESOLUTION_SCALE 2.0
    #elif SKY_RESOLUTION == RESOLUTION_FULL
        #define RESOLUTION_SCALE 1.0
    #endif
    
    vec2 tc = texcoord * RESOLUTION_SCALE;
    if(clamp01(tc) != tc) discard;
    
    vec3 viewSpacePos = setupViewSpacePos(tc, 1.0);
    viewSpacePos = normalize(viewSpacePos);

    vec3 sky = calculateSkyColor(viewSpacePos);
    
    skyColor = max(vec4(1.0 / 65536.0), vec4(sky, 1.0));
}