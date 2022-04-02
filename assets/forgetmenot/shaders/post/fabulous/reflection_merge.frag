#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_reflection;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = texture(u_color, texcoord).rgb;
    vec4 sample = frx_sampleTent(u_reflection, texcoord, 0.0 / frxu_size);
    vec3 reflection = sample.rgb;
    float reflectance = sample.a;

    //if(reflectance > 0.95) reflectance *= color;

    color = mix(color, reflection, reflectance);

    fragColor = vec4(color, 1.0);
}