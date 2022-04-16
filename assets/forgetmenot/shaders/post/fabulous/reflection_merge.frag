#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_reflection;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = texture(u_reflection, texcoord).rgb;

    fragColor = max(vec4(1.0 / 65536.0), vec4(color, 1.0));
}