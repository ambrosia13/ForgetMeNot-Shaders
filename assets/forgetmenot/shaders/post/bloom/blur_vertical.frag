#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    //#ifdef BLUR_FILTER
        fragColor = blur5(u_color, texcoord, vec2(frxu_size), vec2(0.0, 1.0));
    //#else
        //fragColor = textureLod(u_color, texcoord + vec2(0.0, 1.0) * frx_noise2d(texcoord) / 500.0, frxu_lod);
    //#endif
}