#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    //#define texcoord (floor(texcoord * (64.0 * frx_viewAspectRatio)) / (64.0 * frx_viewAspectRatio))

    vec3 color = texture(u_color, texcoord).rgb;

    vec3 finalColor = color.rgb;

    //finalColor = FRX_RRT_AND_ODTF_FIT(finalColor);
    finalColor = frx_toneMap(finalColor);

    finalColor = max(finalColor, vec3(0.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    float l = frx_luminance(finalColor);
    vibrance(finalColor, smoothstep(0.0, 0.35, l) * 0.7 + 0.3);

    vibrance(finalColor, mix(1.0, l, fmn_rainFactor));

    //finalColor = mix(finalColor * smoothstep(0.3, 0.9, 1.0 - pow(distance(texcoord, vec2(0.5)), 1.5)), finalColor, smoothstep(0.3, 0.7, l));

    #ifdef FILM_GRAIN
    l = frx_luminance(finalColor);
    finalColor *= 1.0 + (goldNoise3d().r * (0.5 - 0.4 * smoothstep(0.25, 0.75, l)));
    #endif

    vibrance(finalColor, VIBRANCE);

    fragColor = vec4(clamp01(finalColor), 1.0);
}