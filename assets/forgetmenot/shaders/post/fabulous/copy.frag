#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_depth;
uniform sampler2D u_translucent_depth;
uniform sampler2D u_normal;
uniform sampler2D u_flat_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    // float depth = textureLod(u_depth, texcoord, 0).r;
    // float translucentDepth = texture(u_translucent_depth, texcoord).r;

    // vec3 sceneSpacePos = setupSceneSpacePos(texcoord, depth);
    // vec3 sceneSpacePosBack = setupSceneSpacePos(texcoord, translucentDepth);

    // vec3 viewDir = normalize(setupSceneSpacePos(texcoord, 1.0));
    // vec3 normal = (texture(u_normal, texcoord).rgb * 2.0 - 1.0);
    // vec3 flatNormal = (texture(u_flat_normal, texcoord).rgb * 2.0 - 1.0);
    // viewDir = refract(viewDir, normal - flatNormal, 1.0 / 1.33);

    // vec2 coord = depth != translucentDepth ? sceneSpaceToScreenSpace(sceneSpacePos + viewDir).xy : texcoord;

    vec4 composite = textureLod(u_composite, texcoord, 0);
    // composite = texture(u_composite, texcoord + 0.01 * (composite.a > 0.5 ? (normal.xz) : vec2(0.0)));

    // if(composite.a > 0.5) {
    //     vec3 viewDir = fNormalize(setupSceneSpacePos(texcoord, 0.0));
    //     viewDir = refract(viewDir, normal, 0.999);

    //     coord = sceneSpaceToScreenSpace(viewDir).xy;
    //     composite = texture(u_composite, coord);
    // }

    fragColor = composite;
    // fragColor.rgb = normal.xyz * 0.5 + 0.5;
}