#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_exposure;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 color = texture(u_color, texcoord).rgb;
    vec3 finalColor = color.rgb;

    finalColor = tanh(finalColor);
    //finalColor = 1.0 - exp(-finalColor);

    finalColor = pow(finalColor, vec3(1.0 / 2.2));

    fragColor = vec4(finalColor + step(0.5, frx_noise2d(texcoord)) / 255.0, 1.0);
}