#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_history;
uniform sampler2D u_normal;
uniform sampler2D u_depth;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    fragColor = texture(u_history, texcoord);//normalAwareBlur(u_history, texcoord, 4.0, 3, u_normal, u_depth);
}