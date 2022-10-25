#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_bloom;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
    vec4 bloom = frx_sampleTent(u_bloom, texcoord, 1. / frxu_size, 0) / 6.0;
    bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));

    float bloomLuminance = frx_luminance(bloom.rgb);

    float bloomAmount = 0.16 + 0.3 * pow(tanh(bloomLuminance) * smoothstep(0.0, 1.5, bloomLuminance), 1.0);
    bloomAmount = mix(bloomAmount, 0.5, fmn_rainFactor);

    //fragColor = mix(color, bloom, mix(bloomAmount, 1.0, frx_cameraInFluid));
    fragColor = mix(color, bloom, 0.25 + 0.75 * frx_cameraInFluid);
}