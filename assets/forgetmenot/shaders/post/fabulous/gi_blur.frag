#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_global_illumination;
uniform sampler2D u_normal;

in vec2 texcoord;

layout(location = 0) out vec4 fragColor;

void main() {
    vec4 rays = vec4(1.0);
    #ifdef GLOBAL_ILLUMINATION
        float blurAmount = 8.0;//texture(u_global_illumination, texcoord).a;
        #ifdef GI_FILTER
            rays = normalAwareBlur(u_global_illumination, texcoord, blurAmount, 5, u_normal);
        #else
            rays = texture(u_global_illumination, texcoord);
        #endif
    #endif

    fragColor = rays;
}