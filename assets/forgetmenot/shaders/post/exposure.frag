#include forgetmenot:shaders/lib/includes.glsl 

uniform sampler2D u_color;
uniform sampler2D u_previous;

in vec2 texcoord;

layout(location = 0) out float avgLuminance;

void main() {
     avgLuminance = 0.0;
     const int luminanceLod = 7;

     vec2 size = textureSize(u_color, luminanceLod);
     float totalWeight;

     float texelMaxLuminance = 0.0, texelMinLuminance = 100.0;

     for(int x = 0; x < size.x; x++) {
          for(int y = 0; y < size.y; y++) {
               float distToCenter = length(vec2(x, y) / size - 0.5);
               float currentWeight = 1.0;
               float currentSample = frx_luminance(texelFetch(u_color, ivec2(x, y), luminanceLod).rgb);

               texelMaxLuminance = max(texelMaxLuminance, currentSample);
               texelMinLuminance = min(texelMinLuminance, currentSample);

               avgLuminance += currentSample * currentWeight;
               totalWeight += currentWeight;
          }
     }

     avgLuminance -= texelMaxLuminance + texelMinLuminance;
     avgLuminance /= totalWeight - 2.0;

     float prevLuminance = texelFetch(u_previous, ivec2(0), 0).r;

     // mix factor will be less (slower transition) when brightness is to be increased
     float mixFactor = 0.995;
     if (avgLuminance > prevLuminance) {
          mixFactor = 0.99;
     }

     avgLuminance = max(0.0, mix(prevLuminance, avgLuminance, 1.0 / min(100u, frx_renderFrames + 1u)));
}