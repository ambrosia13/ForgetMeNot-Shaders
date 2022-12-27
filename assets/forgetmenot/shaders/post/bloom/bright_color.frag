#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_emissive;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 sample = texture(u_color, texcoord);
    vec3 color = pow(sample.rgb, vec3(1.5));
    // float emissive = max(0.0, sample.a - 1.0);

    // float luminance = frx_luminance(color);
    // luminance = max(color.r, max(color.g, color.b));

    // //fragColor = vec4(max(color - 1.0, vec3(0.0)), 1.0);
    // fragColor = vec4(color * (frx_smootherstep(0.8, 2.0, luminance)), 1.0);

    // #ifdef BLOOM_MIX_FACTOR
        fragColor = sample;
    // #endif
}