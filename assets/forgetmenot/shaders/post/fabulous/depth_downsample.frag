#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;

in vec2 texcoord;

layout(location = 0) out float fragColor;

void main() {
     init();
     
     ivec2 pos = ivec2(gl_FragCoord.xy) << 1;//ivec2(texcoord * frxu_size) << 1;

     float mn = 1.0;
     mn = min(mn, texelFetch(u_color, pos + ivec2(0, 0), frxu_lod - 1).r);
     mn = min(mn, texelFetch(u_color, pos + ivec2(1, 0), frxu_lod - 1).r);
     mn = min(mn, texelFetch(u_color, pos + ivec2(1, 1), frxu_lod - 1).r);
     mn = min(mn, texelFetch(u_color, pos + ivec2(0, 1), frxu_lod - 1).r);
     fragColor = mn;
}