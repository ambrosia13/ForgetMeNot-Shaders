#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = fxaa(u_color, texcoord);
    //vec3 color = texture(u_color, texcoord).rgb;

    vec3 finalColor = color.rgb;
    finalColor = pow(finalColor, vec3(1.0));


    finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), frx_effectWither);
    finalColor = mix(finalColor, finalColor * vec3(0.7, 1.0, 0.7), frx_effectPoison);

    //contrast(finalColor, mix(0.8, CONTRAST / 10.0, frx_smoothedEyeBrightness.y));
    contrast(finalColor, CONTRAST / 10.0);

    // Credit to Zombye#7365 for making the tone map
    #ifndef DEPRESSING_MODE
        //finalColor *= inversesqrt(pow(finalColor, vec3(2.0)) + 1.0);
        finalColor = tanh(finalColor);
        //finalColor = 1.0 - exp(-finalColor);
    #else
        finalColor = frx_toneMap(finalColor * 1.0); // aces
    #endif
    //finalColor = atan(finalColor * 1.6) / (PI / 2.0);
    //finalColor /= finalColor + 1.0; // reinhard

    // if(any(greaterThan(finalColor, vec3(1.0)))) finalColor = vec3(0.0);

    //vibrance(finalColor, 1.2);
    // finalColor = mix(finalColor, vec3(frx_luminance(finalColor)), 0.1);

    #ifdef FAKE_EYE_ADJUST
        finalColor = pow(finalColor, mix(vec3(1.0 / 2.2), vec3(1.0), max(max(getTimeOfDayFactors().y * 0.5, frx_smoothedEyeBrightness.y), frx_smoothedEyeBrightness.x * 0.5)));
        //finalColor = nightEyeAdjust(finalColor);
    #endif

    fragColor = max(vec4(1.0 / 65536.0), vec4(finalColor.rgb + rand3D(texcoord * 2000.0) / 255.0, 1.0));
}