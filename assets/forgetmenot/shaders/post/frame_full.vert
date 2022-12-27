#include frex:shaders/api/vertex.glsl

uniform mat4 frxu_frameProjectionMatrix;
uniform ivec2 frxu_size;
uniform int frxu_lod;

in vec2 in_uv;
in vec4 in_vertex;

out vec2 texcoord;

void main() {
    vec2 screen = (frxu_frameProjectionMatrix * vec4(in_vertex.xy * frxu_size, 0.0, 1.0)).xy;

    gl_Position = vec4(screen, 0.2, 1.0);
    texcoord = in_uv;
}