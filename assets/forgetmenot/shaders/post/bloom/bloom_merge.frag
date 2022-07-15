#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_bloom;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
    vec4 bloom = frx_sampleTent(u_bloom, texcoord * 0.5, 1. / frxu_size);
    bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));
    #ifdef DEPRESSING_MODE
        color = mix(color, bloom / 6.0, float(all(greaterThan(bloom.rgb, vec3(0.0)))) * clamp01((BLOOM_MIX_FACTOR / 10.0) + 0.3 * frx_smoothedRainGradient + 0.3 * frx_thunderGradient + 0.5 * frx_cameraInFluid));
    #endif
        //color += bloom / 6.0;
        //color = mix(color, bloom / 6.0, frx_luminance(tanh(bloom.rgb / 6.0)));
        //color = mix(color, bloom / 6.0, float(all(greaterThan(bloom.rgb, vec3(0.0)))) * clamp01((BLOOM_MIX_FACTOR / 10.0) + 0.0 * frx_worldIsNether + 0.3 * frx_smoothedRainGradient + 0.2 * frx_thunderGradient + 0.5 * frx_cameraInFluid));
    #endif

    fragColor = mix(color, bloom / 6.0, mix(frx_luminance(tanh(bloom.rgb / 12.0)), 1.0, frx_cameraInFluid));
}