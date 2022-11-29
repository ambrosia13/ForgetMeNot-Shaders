#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    //#define texcoord (floor(texcoord * (0.05 * frxu_size)) / (0.05 * frxu_size))

    vec3 color;
    color = texture(u_color, texcoord).rgb;

    vec3 finalColor = color.rgb;

    // finalColor *= vec3(0.95, 1.0, 0.7);
    // finalColor = mix(finalColor, finalColor / length(finalColor) * pow(length(finalColor), 1.1), 1.0);
    // saturation(finalColor, 0.8);


    float l = frx_luminance(finalColor);
    vibrance(finalColor, sqrt(smoothstep(0.0, 0.25, l)));

    vibrance(finalColor, mix(1.0, tanh(l), fmn_rainFactor));

    finalColor = frx_toneMap(finalColor);

    finalColor = max(finalColor, vec3(0.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));


    //finalColor = mix(finalColor * smoothstep(0.3, 0.9, 1.0 - pow(distance(texcoord, vec2(0.5)), 1.5)), finalColor, smoothstep(0.3, 0.7, l));

    #ifdef FILM_GRAIN
        l = frx_luminance(finalColor);
        finalColor *= 1.0 + (goldNoise3d().r * (0.5 - 0.4 * smoothstep(0.25, 0.75, l)));
    #endif

    #ifdef VISIBILITY_GRAIN
        finalColor += goldNoise3d().r * 0.3 * (1.0 - frx_luminance(finalColor)) * (1.0 - max(frx_smoothedEyeBrightness.x, frx_smoothedEyeBrightness.y));
    #endif

    vibrance(finalColor, VIBRANCE);

    fragColor = vec4(clamp01(finalColor), 1.0);
}