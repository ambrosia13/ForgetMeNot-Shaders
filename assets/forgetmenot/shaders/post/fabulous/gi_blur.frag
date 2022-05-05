#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_global_illumination;
uniform sampler2D u_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 rays = vec4(1.0);
    #ifdef GLOBAL_ILLUMINATION
        #ifdef GI_FILTER
            float blurAmount = texture(u_global_illumination, texcoord).a;
            rays = normalAwareBlur(u_global_illumination, texcoord, 1.0, GI_FILTER_QUALITY, u_normal);
        #else
            rays = texture(u_global_illumination, texcoord);
        #endif
    #endif

    fragColor = max(vec4(1.0 / 65536.0), rays);
}