#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_global_illumination;
uniform sampler2D u_success_dir;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 successDir;

void main() {
    vec4 composite = texture(u_global_illumination, texcoord);
    fragColor = composite;
    successDir = texture(u_success_dir, texcoord);
}