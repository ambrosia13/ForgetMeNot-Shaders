#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_bloom;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = texture(u_color, texcoord);
    vec4 bloom = texture(u_bloom, texcoord * 0.5);
    bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));
    color = mix(color, bloom / 6.0, clamp01((BLOOM_MIX_FACTOR / 10.0) + 0.0 * frx_worldIsNether + 0.3 * frx_smoothedRainGradient + 0.2 * frx_thunderGradient + 0.5 * frx_cameraInFluid));

    fragColor = color;
}