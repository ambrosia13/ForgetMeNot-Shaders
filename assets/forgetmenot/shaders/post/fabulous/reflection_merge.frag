#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_reflection;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    // vec2 coord = texcoord;
    // if(translucentData.b > 0.5) {
    //     float noise = (fbmHash(0.5 * frx_renderSeconds + translucentNormal.xz * 5.0 * vec2(5.0, 2.0), 3) * 2.0 - 1.0);// * smoothstep(0.95, 0.9, translucent_depth);
    //     coord += 0.05 * noise * noise;
    // }

    vec3 color = texture(u_reflection, texcoord).rgb;

    fragColor = max(vec4(1.0 / 65536.0), vec4(color, 1.0));
}