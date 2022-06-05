// Portions taken from robobo1221, https://www.shadertoy.com/view/MstBWs


#define d0(x) (abs(x) + 1e-8)
#define d02(x) (abs(x) + 1e-3)
const vec3 rayleighCoeff ((vec3(0.27, 0.5, 0.7)) * 1e-5);
const vec3 rayleighCoeffNight (vec3(0.27, 0.5, 1.0) * 1e-5); // unused
const vec3 mieCoeff vec3(0.5e-6);
const float sunBrightness = 3.0;
const vec3 totalCoeff = rayleighCoeff + mieCoeff;

vec3 scatter(vec3 coeff, float depth){
	return coeff * depth;
}

vec3 absorb(vec3 coeff, float depth){
	return exp2(scatter(coeff, -depth));
}

float rayleighPhase(float x){
	return 0.375 * (1.0 + x*x);
}
float hgPhase(float x, float g)
{
    float g2 = g*g;
    float x2 = x * x;

    float a = 3.0 * (1.0 - g2);
    float b = 2.0 * (2.0 + g2);
    float c = 1.0 + x2;
    float d = pow(1.0 + g2 - 2.0 * g * x, 1.5);

    return (a / b) * (c / d);
}

float KleinNishina(float cosTheta, float e) {
    return e / (2.0 * PI * (e * (1.0 - cosTheta) + 1.0) * log(2.0 * e + 1.0));
}

float miePhaseSky(float x, float depth)
{
    //return KleinNishina(x, 4500.0);
 	return hgPhase(x, 0.99);
}
float calcParticleThickness(float depth){
   	
    depth = depth * 2.0;
    //depth = max(depth + 0.02, 0.02);
    depth = abs(depth);
    if(depth < 0.01) depth = 0.01;
    depth = 1.0 / depth;
    
	return 100000.0 * depth;   
}

float calcParticleThicknessConst(const float depth){
    
	return 100000.0 / max(depth * 2.0 - 0.01, 0.01);   
}

vec3 calcAtmosphericScatter(in vec3 viewSpacePos, out vec3 absorbLight) {
    viewSpacePos = normalize(viewSpacePos);
    const float ln2 = log(2.0);
    
    float lDotW = max(0.0, dot(getSunVector(), viewSpacePos));
    float lDotU = max(0.0, dot(getSunVector(), vec3(0.0, 1.0, 0.0)));
    float uDotW = max(0.0, dot(vec3(0.0, 1.0, 0.0), viewSpacePos));
    
	float opticalDepth = calcParticleThickness(uDotW);
    float opticalDepthLight = calcParticleThickness(smoothstep(0.0, 0.5, lDotU));
    
    vec3 scatterView = scatter(totalCoeff, opticalDepth);
    vec3 absorbView = absorb(totalCoeff, opticalDepth);
    
    vec3 scatterLight = scatter(totalCoeff, opticalDepthLight);
         absorbLight = absorb(totalCoeff, opticalDepthLight);
    	 
    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);
    
    vec3 mieScatter = scatter(mieCoeff, opticalDepth) * miePhaseSky(lDotW, opticalDepth);
    vec3 rayleighScatter = scatter(rayleighCoeff, opticalDepth) * rayleighPhase(lDotW);
    
    vec3 scatterSun = mieScatter + rayleighScatter;
        
    vec3 atmosphere = pow((scatterSun * absorbSun) * sunBrightness, vec3(1.0 / 2.2));
    return mix(vec3(frx_luminance(atmosphere)), atmosphere, 1.0);
}
vec3 calcAtmosphericScatterTop(in vec3 viewSpacePos) {
    viewSpacePos = normalize(viewSpacePos);
    const float ln2 = log(2.0);
    
    float lDotU = max(0.0, dot(getSunVector(), vec3(0.0, 1.0, 0.0)));
    
	float opticalDepth = calcParticleThicknessConst(1.0);
    float opticalDepthLight = calcParticleThickness(lDotU);
    
    vec3 scatterView = scatter(totalCoeff, opticalDepth);
    vec3 absorbView = absorb(totalCoeff, opticalDepth);
    
    vec3 scatterLight = scatter(totalCoeff, opticalDepthLight);
    vec3 absorbLight = absorb(totalCoeff, opticalDepthLight);
    
    vec3 absorbSun = d02(absorbLight - absorbView) / d02((scatterLight - scatterView) * ln2);
    
    vec3 mieScatter = scatter(mieCoeff, opticalDepth) * 0.25;
    vec3 rayleighScatter = scatter(rayleighCoeff, opticalDepth) * 0.375;
    
    vec3 scatterSun = mieScatter + rayleighScatter;
    
    return (scatterSun * absorbSun) * sunBrightness;
}
