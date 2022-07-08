#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_global_illumination;
uniform sampler2D u_solid_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 composite = texture(u_composite, texcoord);
    fragColor = composite;
}