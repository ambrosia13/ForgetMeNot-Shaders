#define INCLUDE_NOISE
#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = texture(u_color, texcoord).rgb;

    #ifdef CHROMATIC_ABBERATION
        color.r = texture(u_color, texcoord + vec2(1.0 / frxu_size.x, 0.0)).r;
        color.b = texture(u_color, texcoord - vec2(1.0 / frxu_size.x, 0.0)).b;
    #endif

    #ifdef LSD_MODE
        vec2 noise = vec2(smoothHash(texcoord * 30.0 + frx_renderSeconds * 0.1), smoothHash(texcoord * 30.0 + 1000.0 - frx_renderSeconds * 0.1)) * 0.005;

        #define texcoord (texcoord+noise)
        color.r = frx_sample13(u_color, texcoord + 0.01 * vec2(sin(frx_renderSeconds), cos(frx_renderSeconds)), 1.0 / frxu_size).r;
        color.g = frx_sample13(u_color, texcoord + 0.01 * vec2(2.0 * -sin(frx_renderSeconds + 50.0), cos(frx_renderSeconds + 50.0)), 1.0 / frxu_size).g;
        color.b = frx_sample13(u_color, texcoord + 0.01 * vec2(sin(frx_renderSeconds - 50.0), 2.0 * -cos(frx_renderSeconds - 50.0)), 1.0 / frxu_size).b;
    #endif

    vec3 finalColor = color.rgb;
    float l = frx_luminance(finalColor);

    finalColor = frx_toneMap(finalColor);

    // finally, back into srgb
    finalColor = clamp01(pow(finalColor, vec3(1.0 / 2.2)) + randF() * 0.01 - 0.005);

    fragColor = finalColor.rgbb * FMN_MASK.xxxy + FMN_MASK.yyyx;
}