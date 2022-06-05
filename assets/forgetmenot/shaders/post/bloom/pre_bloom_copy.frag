#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous_frame;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color;
        color = texture(u_color, texcoord);

    fragColor = max(vec4(1.0 / 65536.0), color);
}