#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out float avgLuminance;

void main() {
     avgLuminance = 0.0;
     const int luminanceLod = 9;

     vec2 size = textureSize(u_color, luminanceLod);
     int numSamples;

     for(int x = 0; x < size.x; x++) {
          for(int y = 0; y < size.y; y++) {
               avgLuminance += frx_luminance(texelFetch(u_color, ivec2(x, y), luminanceLod).rgb); 
               numSamples++;
          }
     }

     avgLuminance /= numSamples;

     avgLuminance = mix(avgLuminance, texelFetch(u_previous, ivec2(0), 0).r, 0.99);
}