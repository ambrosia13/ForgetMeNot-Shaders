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

    vec3 sussy = vec3(1.000,0.076,0.029);
        
    if(texcoord.x < 0.9 && texcoord.x > 0.1 && texcoord.y < 0.8 && texcoord.y > 0.3) {
        sussy = vec3(0.022,0.023,0.025);
    }

    if(texcoord.x < 0.8 && texcoord.x > 0.2 && texcoord.y < 0.7 && texcoord.y > 0.4) {
        sussy = vec3(0.655,0.941,0.950);
    }

    if(texcoord.x < 0.8 && texcoord.x > 0.2 && texcoord.y < 0.5 && texcoord.y > 0.4 
    || texcoord.x < 0.8 && texcoord.x > 0.7 && texcoord.y < 0.7 && texcoord.y > 0.4) {
        sussy = vec3(0.270,0.365,0.545);
    }

    if(texcoord.x < 0.6 && texcoord.x > 0.3 && texcoord.y < 0.7 && texcoord.y > 0.6) {
        sussy = vec3(0.924,0.971,1.000);
    }

    finalColor.rgb = mix(finalColor, sussy, 0.5);

    fragColor = vec4(finalColor.rgb, 1.0);
}