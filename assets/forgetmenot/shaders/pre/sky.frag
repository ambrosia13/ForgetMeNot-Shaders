#include forgetmenot:assets/shaders/pre/atmos_common.glsl 

uniform sampler2D u_tLut;
uniform sampler2D u_skyLut;

layout(location = 0) out vec4 fragColor;

/*
 * Final output basically looks up the value from the skyLUT, and then adds a sun on top,
 * does some tonemapping.
 */
vec3 getValFromSkyLUT(vec3 rayDir, vec3 sunDir) {
    float height = length(viewPos);
    vec3 up = viewPos / height;
    
    float horizonAngle = safeacos(sqrt(height * height - groundRadiusMM * groundRadiusMM) / height);
    float altitudeAngle = horizonAngle - acos(dot(rayDir, up)); // Between -PI/2 and PI/2
    float azimuthAngle; // Between 0 and 2*PI
    if (abs(altitudeAngle) > (0.5*PI - .0001)) {
        // Looking nearly straight up or down.
        azimuthAngle = 0.0;
    } else {
        vec3 right = cross(sunDir, up);
        vec3 forward = cross(up, right);
        
        vec3 projectedDir = normalize(rayDir - up*(dot(rayDir, up)));
        float sinTheta = dot(projectedDir, right);
        float cosTheta = dot(projectedDir, forward);
        azimuthAngle = atan(sinTheta, cosTheta) + PI;
    }
    
    // Non-linear mapping of altitude angle. See Section 5.3 of the paper.
    float v = 0.5 + 0.5*sign(altitudeAngle)*sqrt(abs(altitudeAngle)*2.0/PI);
    vec2 uv = vec2(azimuthAngle / (2.0*PI), v);
    uv *= skyLUTRes;
    uv /= iChannelResolution[1].xy;
    
    return texture(iChannel1, uv).rgb;
}

vec3 jodieReinhardTonemap(vec3 c){
    // From: https://www.shadertoy.com/view/tdSXzD
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 tc = c / (c + 1.0);
    return mix(c / (l + 1.0), tc, tc);
}

vec3 sunWithBloom(vec3 rayDir, vec3 sunDir) {
    const float sunSolidAngle = 0.53*PI/180.0;
    const float minSunCosTheta = cos(sunSolidAngle);

    float cosTheta = dot(rayDir, sunDir);
    if (cosTheta >= minSunCosTheta) return vec3(1.0);
    
    float offset = minSunCosTheta - cosTheta;
    float gaussianBloom = exp(-offset*50000.0)*0.5;
    float invBloom = 1.0/(0.02 + offset*300.0)*0.01;
    return vec3(gaussianBloom+invBloom);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec3 sunDir = getSunDir(iTime);
    
    vec3 camDir = normalize(vec3(0.0, 0.27, -1.0));
    float camFOVWidth = PI/3.5;
    float camWidthScale = 2.0*tan(camFOVWidth/2.0);
    float camHeightScale = camWidthScale*iResolution.y/iResolution.x;
    
    vec3 camRight = normalize(cross(camDir, vec3(0.0, 1.0, 0.0)));
    vec3 camUp = normalize(cross(camRight, camDir));
    
    vec2 xy = 2.0 * (fragCoord.xy / iResolution.xy) - 1.0;
    vec3 rayDir = normalize(camDir + camRight*xy.x*camWidthScale + camUp*xy.y*camHeightScale);
    
    vec3 lum = getValFromSkyLUT(rayDir, sunDir);

    // Bloom should be added at the end, but this is subtle and works well.
    vec3 sunLum = sunWithBloom(rayDir, sunDir);
    // Use smoothstep to limit the effect, so it drops off to actual zero.
    sunLum = smoothstep(0.002, 1.0, sunLum);
    if (length(sunLum) > 0.0) {
        if (rayIntersectSphere(viewPos, rayDir, groundRadiusMM) >= 0.0) {
            sunLum *= 0.0;
        } else {
            // If the sun value is applied to this pixel, we need to calculate the transmittance to obscure it.
            sunLum *= getValFromTLUT(iChannel0, iChannelResolution[0].xy, viewPos, sunDir);
        }
    }
    lum += sunLum;
    
    // Tonemapping and gamma. Super ad-hoc, probably a better way to do this.
    lum *= 15.0;
    //lum = pow(lum, vec3(1.3));
    lum /= 0.5 + 0.5 * (smoothstep(0.0, 0.2, clamp(sunDir.y, 0.0, 1.0))*2.0 + 0.15);
    
    //lum = jodieReinhardTonemap(lum);
    lum = tanh(lum);
    
    lum = pow(lum, vec3(1.0/2.2));
    
    fragColor = vec4(lum,1.0);
}