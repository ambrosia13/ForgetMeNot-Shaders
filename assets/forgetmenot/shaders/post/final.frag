#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    //vec3 color = fxaa(u_color, texcoord);
    vec3 color = texture(u_color, texcoord).rgb;

    vec3 finalColor = pow(color.rgb, vec3(1.2));

    finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), frx_effectWither);
    finalColor = mix(finalColor, finalColor * vec3(0.7, 1.0, 0.7), frx_effectPoison);

    contrast(finalColor, CONTRAST / 10.0);

    // Credit to Zombye#7365 for making the tone map
    finalColor *= inversesqrt(pow(finalColor, vec3(2.0)) + 1.0);
    // else finalColor = frx_toneMap(finalColor * 1.0);

    // if(any(greaterThan(finalColor, vec3(1.0)))) finalColor = vec3(0.0);

    vibrance(finalColor, 1.2);
    // finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), 0.1);

    fragColor = max(vec4(1.0 / 65536.0), vec4(finalColor.rgb + rand3D(texcoord) / 255.0, 1.0));
}