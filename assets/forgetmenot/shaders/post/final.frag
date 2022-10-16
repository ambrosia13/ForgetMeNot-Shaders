#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    //#define texcoord (floor(texcoord * (64.0 * frx_viewAspectRatio)) / (64.0 * frx_viewAspectRatio))

    vec3 color = texture(u_color, texcoord).rgb;
    //color = floor(color * 16.0 + 0.5) / 16.0;
    vec3 finalColor = color.rgb;

    //finalColor = FRX_RRT_AND_ODTF_FIT(finalColor);
    finalColor = frx_toneMap(finalColor);

    finalColor = max(finalColor, vec3(0.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    float l = frx_luminance(finalColor);
    vibrance(finalColor, smoothstep(0.0, 0.35, l) * 0.7 + 0.3);

    vibrance(finalColor, mix(1.0, l, fmn_rainFactor));

    //finalColor = mix(finalColor * smoothstep(0.3, 0.9, 1.0 - pow(distance(texcoord, vec2(0.5)), 1.5)), finalColor, smoothstep(0.3, 0.7, l));

    fragColor = vec4(finalColor, 1.0);
}