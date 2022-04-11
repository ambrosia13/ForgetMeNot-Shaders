#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_normal;
uniform sampler2D u_data;
uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform sampler2D u_particles_depth;
uniform sampler2D u_previous_frame;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec3 tdata = getTimeOfDayFactors();
    vec3 cloudsColor = vec3(1.0);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.2, 0.3), tdata.z);
    cloudsColor = mix(cloudsColor, vec3(0.3, 0.3, 0.4), tdata.y);

    vec3 normal = texture(u_normal, texcoord).rgb * 2.0 - 1.0;
    //normal += rand3D(texcoord) / 255.0;
    float depth = texture(u_depth, texcoord).r;
    float particlesDepth = texture(u_particles_depth, texcoord).r;

    vec3 sample = texture(u_data, texcoord).rgb;
    vec2 light = sample.gb;
    vec3 f0 = sample.rrr;

    vec3 sceneColor = texture(u_color, texcoord).rgb;

    vec3 reflectColor = vec3(0.0);
    vec3 reflectance = vec3(0.0);
    vec3 sunReflection = vec3(0.0);

    if(depth != 1.0 && f0.r > 0.9) {
        vec3 viewSpacePos = setupViewSpacePos(texcoord, depth);
        vec3 cleanViewSpacePos = setupCleanViewSpacePos(texcoord, depth);

        float lengthC = length(cleanViewSpacePos);

        vec3 viewDir = normalize(viewSpacePos);
        vec3 cleanViewDir = normalize(cleanViewSpacePos);

        vec3 reflectedViewDir = reflect(viewDir, normal);
        vec3 cleanReflectedViewDir = reflect(cleanViewDir, normal);

        vec3 reflectedScreenDir = viewSpaceToScreenSpace(reflectedViewDir);
        vec3 cleanReflectedScreenDir = cleanViewSpaceToScreenSpace(cleanReflectedViewDir * lengthC);

        bool isMetal = false;
        if(f0.r == 20.0) {
            isMetal = true;
        }

        if(clamp01(cleanReflectedScreenDir) != cleanReflectedScreenDir) {
            cleanReflectedScreenDir.xy = clamp01(cleanReflectedScreenDir.xy);
            reflectColor = mix(mix(calculateSkyColor(reflectedViewDir), vec3(1.0), calculateBasicClouds(reflectedViewDir).x * cloudsColor), vec3(0.2), 0.0);
            // sunReflection = calculateSun(reflectedViewDir);
        } else {
            reflectColor = texture(u_previous_frame, cleanReflectedScreenDir.xy).rgb;
        }

        sunReflection = calculateSun(reflectedViewDir) * (light.y / 20.0);

        //reflectColor = cleanReflectedScreenDir.xyy;

        float NdotV = max(0.0, dot(-normal, viewDir));
        // for some reason schlick function returns NaN:
        reflectance = getReflectance(f0 / 20.0, clamp01(NdotV));
        //reflectance = vec3(0.05 + (1.0 - 0.05) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)) * (1.0 - dot(viewDir, -normal)));
    }

    sceneColor = mix(sceneColor, reflectColor, clamp01(reflectance));

    fragColor = vec4(sceneColor + sunReflection * 0.5, 1.0);
}