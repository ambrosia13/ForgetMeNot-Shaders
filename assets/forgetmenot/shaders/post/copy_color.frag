#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = texture(u_color, texcoord);
    fragColor = color;
}