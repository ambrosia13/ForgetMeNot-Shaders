#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out float avgLuminance;

void main() {
     avgLuminance = 0.0;
     const int luminanceLod = 7;

     vec2 size = textureSize(u_color, luminanceLod);
     int numSamples;

     for(int x = 0; x < size.x; x++) {
          for(int y = 0; y < size.y; y++) {
               avgLuminance += frx_luminance(texelFetch(u_color, ivec2(x, y), luminanceLod).rgb);

               // // More weight to the center pixel
               // if(x == size.x / 2) avgLuminance *= 1.5;
               // else avgLuminance *= 0.75;
               
               numSamples++;
          }
     }

     avgLuminance /= numSamples;

     float prevLuminance = texelFetch(u_previous, ivec2(0), 0).r;

     // mix factor will be less (slower transition) when brightness is to be increased
     float mixFactor = 0.995;
     if (avgLuminance > prevLuminance) {
          mixFactor = 0.99;
     }

     avgLuminance = max(0.0, mix(avgLuminance, prevLuminance, 0.99));
}