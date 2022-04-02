#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 color = texture(u_color, texcoord);

    vec3 finalColor = color.rgb;

    finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), frx_effectWither);
    finalColor = mix(finalColor, finalColor * vec3(0.7, 1.0, 0.7), frx_effectPoison);

    // Credit to Zombye#7365 for making the tone map
    finalColor *= inversesqrt(pow(finalColor, vec3(2.0)) + 1.0);

    if(any(greaterThan(finalColor, vec3(1.0)))) finalColor = vec3(0.0);

    fragColor = vec4(finalColor.rgb, 1.0);
}