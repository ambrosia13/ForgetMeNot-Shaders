#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
    fragColor = color;
}