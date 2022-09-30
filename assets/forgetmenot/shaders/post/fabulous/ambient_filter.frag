#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_rtao;
uniform sampler2D u_normal;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = normalAwareBlur(u_rtao, texcoord, 8.0, 3, u_normal, u_depth);

    fragColor = color;
}