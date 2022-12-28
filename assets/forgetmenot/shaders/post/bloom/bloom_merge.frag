#include forgetmenot:shaders/lib/includes.glsl

uniform sampler2D u_color;
uniform sampler2D u_bloom;

layout(location = 0) out vec4 fragColor;

in vec2 texcoord;

void main() {
     vec4 color = vec4(texture(u_color, texcoord).rgb, 1.0);
     vec4 bloom = frx_sampleTent(u_bloom, texcoord, 1. / frxu_size, 0) / 6.0;
     //bloom.rgb = pow(bloom.rgb, vec3(1.0 / 1.5));

     float bloomLuminance = frx_luminance(bloom.rgb);

     fragColor = mix(color, bloom, mix(0.25 + 0.5 * smoothstep(0.0, 8.0, bloomLuminance), 1.0, frx_cameraInFluid));
}