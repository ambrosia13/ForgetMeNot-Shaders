#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_main_depth;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_particles_depth;

in vec2 texcoord;

layout(location = 0) out vec4 minDepth;
layout(location = 1) out vec4 maxDepth;

void main() {
    // float handDepth = texture(u_main_depth, texcoord).r;
    // float translucentDepth = texture(u_translucent_depth, texcoord).r;
    // float particlesDepth = texture(u_particles_depth, texcoord).r;

    // minDepth = vec4(min(handDepth, min(translucentDepth, particlesDepth)));
    // maxDepth = vec4(max(translucentDepth, particlesDepth));
}