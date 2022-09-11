#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_history;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = texture(u_history, texcoord);
}