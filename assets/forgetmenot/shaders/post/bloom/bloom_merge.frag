#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_bloom;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
    vec4 bloom = frx_sampleTent(u_bloom, texcoord, 1. / frxu_size, 0) / 6.0;
    bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));

    float bloomFactor = mix(pow(frx_luminance(tanh(pow(bloom.rgb, vec3(1.0 / 4.0)))), 5.0), 1.0, frx_cameraInFluid);

    #ifdef DEPRESSING_MODE
        bloomFactor = mix(frx_luminance(tanh(bloom.rgb)), 1.0, frx_cameraInFluid);
    #endif

    fragColor = mix(color, bloom, bloomFactor);
}