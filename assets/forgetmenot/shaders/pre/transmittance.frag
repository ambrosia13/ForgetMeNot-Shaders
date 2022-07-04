#include forgetmenot:assets/shaders/pre/atmos_common.glsl 

// Buffer A generates the Transmittance LUT. Each pixel coordinate corresponds to a height and sun zenith angle, and
// the value is the transmittance from that point to sun, through the atmosphere.
const float sunTransmittanceSteps = 40.0;

vec3 getSunTransmittance(vec3 pos, vec3 sunDir) {
    if (rayIntersectSphere(pos, sunDir, groundRadiusMM) > 0.0) {
        return vec3(0.0);
    }
    
    float atmoDist = rayIntersectSphere(pos, sunDir, atmosphereRadiusMM);
    float t = 0.0;
    
    vec3 transmittance = vec3(1.0);
    for (float i = 0.0; i < sunTransmittanceSteps; i += 1.0) {
        float newT = ((i + 0.3)/sunTransmittanceSteps)*atmoDist;
        float dt = newT - t;
        t = newT;
        
        vec3 newPos = pos + t*sunDir;
        
        vec3 rayleighScattering, extinction;
        float mieScattering;
        getScatteringValues(newPos, rayleighScattering, mieScattering, extinction);
        
        transmittance *= exp(-dt*extinction);
    }
    return transmittance;
}

void main() {
    if (gl_FragCoord.x >= (tLUTRes.x+1.5) || gl_FragCoord.y >= (tLUTRes.y+1.5)) {
        return;
    }
    float u = clamp(gl_FragCoord.x, 0.0, tLUTRes.x-1.0)/tLUTRes.x;
    float v = clamp(gl_FragCoord.y, 0.0, tLUTRes.y-1.0)/tLUTRes.y;
    
    float sunCosTheta = 2.0*u - 1.0;
    float sunTheta = safeacos(sunCosTheta);
    float height = mix(groundRadiusMM, atmosphereRadiusMM, v);
    
    vec3 pos = vec3(0.0, height, 0.0); 
    vec3 sunDir = normalize(vec3(0.0, sunCosTheta, -sin(sunTheta)));
    
    fragColor = vec4(getSunTransmittance(pos, sunDir), 1.0);
}