#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_normal;
uniform sampler2D u_data;
uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform sampler2D u_particles_depth;
uniform sampler2D u_previous_frame;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 sceneColor = texture(u_color, texcoord).rgb;
    fragColor = max(vec4(1.0 / 65536.0), vec4(sceneColor, 1.0));
}