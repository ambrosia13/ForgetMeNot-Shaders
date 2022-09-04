#include frex:shaders/api/vertex.glsl
#include forgetmenot:shaders/lib/includes.glsl

uniform mat4 frxu_frameProjectionMatrix;

out vec2 texcoord;
out vec3 skyLightColor;

void main() {
     vec2 screen = (frxu_frameProjectionMatrix * vec4(in_vertex.xy * frxu_size, 0.0, 1.0)).xy;

     gl_Position = vec4(screen, 0.2, 1.0);
     texcoord = in_uv;

     for(int i = 0; i < 16; i++) {
          skyLightColor += getSkyColor(normalize(goldNoise3d(float(i)) + vec3(0.0, 1.0, 0.0)), 0.0) / 16.0;
     }
}