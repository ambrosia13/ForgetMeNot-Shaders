#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_global_illumination;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 rays = vec4(1.0);
    #ifdef GLOBAL_ILLUMINATION
        rays = texture(u_global_illumination, texcoord);
    #endif

    vec4 composite = texture(u_composite, texcoord);
    fragColor = composite * rays;
}