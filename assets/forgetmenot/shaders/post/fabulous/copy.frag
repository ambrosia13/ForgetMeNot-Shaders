#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_composite;
uniform sampler2D u_global_illumination;
uniform sampler2D u_solid_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 rays = vec4(1.0);
    #ifdef GLOBAL_ILLUMINATION
        #ifdef GI_FILTER
            float blurAmount = texture(u_global_illumination, texcoord).a;
            rays = normalAwareBlur(u_global_illumination, texcoord, 1.0, GI_FILTER_QUALITY, u_solid_normal);
            //rays = normalLockedBlur(u_global_illumination, texcoord, frxu_size, vec2(0.0, 1.0), u_solid_normal);
        #else
            rays = texture(u_global_illumination, texcoord);
        #endif
    #endif

    vec4 composite = texture(u_composite, texcoord);
    fragColor = max(vec4(1.0 / 65536.0), composite * rays);
}