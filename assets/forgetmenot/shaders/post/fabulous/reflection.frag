#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_normal;
uniform sampler2D u_fresnel;
uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    #define texcoord texcoord*1.0
    if(clamp01(texcoord) != texcoord) discard;
    vec4 sample = texture(u_normal, texcoord);
    vec3 normal = sample.rgb * 2.0 - 1.0;
    //normal += rand3D(texcoord) / 40.0;
    float depth = sample.a;

    vec3 f0 = texture(u_fresnel, texcoord).rgb;

    vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
    vec3 viewDir = normalize(viewSpacePos);
    vec3 rayDir = reflect(viewDir, normal);

    vec3 reflection = vec3(0.0);

    for(int i = 0; i < 15; i++) {
        viewSpacePos += (rayDir * mix(rand3D(texcoord), vec3(1.0), 0.95)) / max(vec3(1.0), 15.0 * dot(viewDir, normal));

        vec3 screenPos = viewSpaceToScreenSpace(viewSpacePos);
        if(clamp01(screenPos.xy) != screenPos.xy) continue;
        if(screenPos.z > 1.0) break;

        float depthQuery = texture(u_normal, screenPos.xy).a;
        if(screenPos.z > depthQuery && abs(screenPos.z - depthQuery) < 0.01) { 
            reflection = texture(u_color, screenPos.xy).rgb;
            break;
        } else reflection = vec3(10.0);
    }
    
    vec3 reflectance = getReflectance(f0, dot(viewDir, -normal)); // for some reason this causes NaN
    float thing = 0.05 + (1.0 - 0.05) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal));
    if(depth >= 1.0) thing = 0.0;
    if(frx_luminance(reflection) > 2.0) {
        thing = 0.0;
        reflection.rgb /= 10.0;
    }
    // if(frx_luminance(f0) > 0.95 && frx_luminance(reflection) > 5.0) thing = 1.0;

    fragColor = vec4(reflection, thing);
}