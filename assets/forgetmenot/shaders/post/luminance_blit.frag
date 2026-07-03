#include forgetmenot:shaders/lib/inc/header.glsl

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out float luminance;

void main() {
    float minLuminance = frx_worldIsNether == 1 ? netherMinLuminance : overworldMinLuminance;
    float maxLuminance = frx_worldIsNether == 1 ? netherMaxLuminance : overworldMaxLuminance;

    luminance = clamp(frx_luminance(texture(u_color, texcoord).rgb), minLuminance, maxLuminance);
}
