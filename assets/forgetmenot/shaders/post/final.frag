#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = fxaa(u_color, texcoord).rgb;

    //color + color * min(40.0, pow(frx_luminance(color), 2.0)

    //vec3 color = texture(u_color, texcoord).rgb;

    vec3 finalColor = color.rgb;


    finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), frx_effectWither);
    finalColor = mix(finalColor, finalColor * vec3(0.7, 1.0, 0.7), frx_effectPoison);

    //contrast(finalColor, mix(0.8, CONTRAST / 10.0, frx_smoothedEyeBrightness.y));
    contrast(finalColor, CONTRAST / 10.0);

    //#define ACES_TONEMAP

    // Credit to Zombye#7365 for making the tone map
    #ifdef ACES_TONEMAP
        finalColor = frx_toneMap(finalColor * 1.);
        vibrance(finalColor, 0.9);
        contrast(finalColor, 1.1);
        finalColor = mix(vec3(frx_luminance(finalColor)), finalColor, 0.5 + 0.5 * smoothstep(0.0, 0.5, frx_luminance(finalColor)));
    #else
        finalColor = tanh(finalColor);
        // vibrance(finalColor, 0.75);
        // finalColor = mix(vec3(frx_luminance(finalColor)), finalColor, 0.5 + 0.5 * smoothstep(0.0, 0.5, frx_luminance(finalColor)));
        // finalColor.r = pow(finalColor.r, 1.3);
        // finalColor.g = pow(finalColor.g, 1.1);
        //finalColor.b = pow(finalColor.b, 1.1);
        //finalColor.gb *= 1.1;
    #endif

    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    fragColor = max(vec4(1.0 / 65536.0), vec4(finalColor.rgb + rand3D(texcoord * 2000.0) / 255.0, 1.0));
}