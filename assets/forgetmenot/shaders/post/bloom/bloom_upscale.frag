#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_prior;
uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    if(clamp01(texcoord) != texcoord) discard;
    #ifndef BLUR_FILTER
        fragColor = frx_sampleTent(u_prior, texcoord * 0.5, 1. / frxu_size) + texture(u_color, texcoord);
    #else
        fragColor = texture(u_prior, texcoord * 0.5) + texture(u_color, texcoord);
    #endif
}