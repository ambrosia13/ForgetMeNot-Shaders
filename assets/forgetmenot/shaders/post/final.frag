#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = texture(u_color, texcoord).rgb;
    vec3 finalColor = color.rgb;

    //finalColor *= vec3(1.1, 1.1, 0.9);

    //finalColor = tanh(finalColor);
    finalColor = 1.0 - exp(-finalColor);
    //finalColor = frx_toneMap(finalColor);
    //finalColor *= inversesqrt(finalColor * finalColor + 1.0);

    finalColor = max(finalColor, vec3(0.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    float l = frx_luminance(finalColor);

    //vibrance(finalColor, l);
    //finalColor = mix(finalColor * smoothstep(0.3, 0.9, 1.0 - pow(distance(texcoord, vec2(0.5)), 1.5)), finalColor, smoothstep(0.3, 0.7, l));

    //if(texcoord.x > 0.5) vibrance(finalColor, pow(l, 1.0 / 2.0));

    //finalColor *= 0.5 + 0.5 * smoothstep(-0.3, 0.9, pow(3.0 * texcoord.x * texcoord.y * (1.0 - texcoord.x) * (1.0 - texcoord.y), 0.25));

    finalColor = mix(finalColor, 1.0 - finalColor, clamp01(frx_skyFlashStrength));

    fragColor = vec4(finalColor + frx_noise2d(texcoord) / 100.0, 1.0);
}