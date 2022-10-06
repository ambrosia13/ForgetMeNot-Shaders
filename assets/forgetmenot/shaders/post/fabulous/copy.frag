#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    // vec3 normal = normalize(texture(u_normal, texcoord).rgb) * 2.0 - 1.0;

    vec4 composite = texture(u_composite, texcoord);
    // composite = texture(u_composite, texcoord - (composite.a > 0.5 ? normal.zz * 0.1 : vec2(0.0)));

    // vec2 coord;
    // if(composite.a > 0.5) {
    //     vec3 viewDir = normalize(setupSceneSpacePos(texcoord, 1.0));
    //     viewDir = refract(viewDir, normal, 0.99);

    //     coord = sceneSpaceToScreenSpace(viewDir).xy;
    //     composite = texture(u_composite, coord);
    // }

    fragColor = composite;
    //fragColor.rgb = normal.yyy;
}