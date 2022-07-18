// ---------------------------------------
// Original sky approximation from:
// https://www.shadertoy.com/view/MstBWs 
// by robobo1221
// The rest done by me
// ---------------------------------------
// A very simple atmospheric scattering model, without any raymarching
// Very fast, almost free

vec3 sunDisk(in vec3 viewSpacePos, out float sunDisk) {
    viewSpacePos = normalize(viewSpacePos);
    float sun = dot(viewSpacePos, getSunVector());
    
    sun = smoothstep(0.9995, 0.9996, sun);
    sunDisk = sun;
    vec3 sunCol = sun * SUN_COLOR;

    float factor = mix(1.0, 0.0, frx_smoothedRainGradient);
    factor = mix(factor, 0.0, frx_thunderGradient);

    sunDisk *= 0.0 * smoothstep(0.0, -0.1, smoothstep(0.0, -0.1, getSunVector().y));

    return sunCol * factor * frx_worldIsOverworld;
}
vec3 moonDisk(in vec3 viewSpacePos, out float moonDisk) {
    viewSpacePos = normalize(viewSpacePos);
    float moon = dot(viewSpacePos, getMoonVector());
    
    moon = smoothstep(0.9996, 0.9997, moon);
    moonDisk = moon;
    vec3 moonCol = moon * MOON_COLOR;

    float factor = mix(1.0, 0.0, frx_smoothedRainGradient);
    factor = mix(factor, 0.0, frx_thunderGradient);

    moonDisk *= smoothstep(0.1, 0.0, smoothstep(0.0, -0.1, getMoonVector().y));

    return moonCol * factor * frx_worldIsOverworld;
}



vec3 scatter(vec3 coeff, float depth){
	return coeff * depth;
}

vec3 absorb(vec3 coeff, float depth){
	return exp2(scatter(coeff, -depth));
}

float henyeyGreenstein(float x, float g)
{
    float g2 = g * g;
    float x2 = x * x;

    float a = 3.0 * (1.0 - g2);
    float b = 2.0 * (2.0 + g2);
    float c = 1.0 + x2;
    float d = pow(1.0 + g2 - 2.0 * g * x, 1.5);

    return (a / b) * (c / d);
}

float kleinNishina(float x, float e) {
    return e / (2.0 * PI * (e * (1.0 - x) + 1.0) * log(2.0 * e + 1.0));
}

float rayleighPhase(float x){
    return 0.75 * (1.0 + x);
    //return henyeyGreenstein(x, 0.0);
	//return (3.0 / (16.0 * PI)) * (1.0 + x * x);
}
float miePhase(float x, float mieAmount)
{
    return kleinNishina(pow(x, 1.0 / mieAmount), SUN_ENERGY);
 	//return henyeyGreenstein(x, 0.99);
}
float particleThickness(float depth){
   	
    depth = depth * 2.0;
    depth = max(depth + 0.02, 0.02);
    // depth = abs(depth);
    // if(depth < 0.01) depth = 0.01;
    depth = 1.0 / (depth);
    
	return 100000.0 * depth;   
}

float particleThicknessConst(const float depth){
	return 100000.0 / max(depth * 2.0 - 0.01, 0.01);   
}

#define d0(x) (abs(x) + 1e-8)
#define d02(x) (abs(x) + 1e-3)
const vec3 kRlh = (vec3(0.27, 0.5, 1.0) * 1e-5);
const vec3 kMie = vec3(0.5e-6);
const vec3 kTotal = kRlh + kMie;

vec3 atmosphericScattering(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    const float ln2 = log(2.0);

    vec3 viewDir = normalize(viewSpacePos);
    vec3 unmodifiedViewDir = viewDir;

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.8, 0.3, 1.0) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.1, 0.2));
        //sunVector.yz = rotate2D(sunVector.yz, frx_renderSeconds);
        //sunVector.y += sin(frx_renderSeconds);
        sunVector = normalize(sunVector);
    }

    //viewDir.y = mix(viewDir.y, viewDir.y, smoothstep(0.01, -0.0, viewDir.y));
    //viewDir.y = clamp01(viewDir.y + 0.5);

    // -------
    // Don't question my methods
    // -------

    float upDot = (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / SKY_GROUND_FOG) : viewDir.y);
    upDot = pow(upDot, 1.0) * (frx_worldIsEnd == 1 ? 50.0 : 1.0);
	float opticalDepth = particleThickness(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));
    //if(viewDir.y < 0.0) opticalDepth = mix(opticalDepth, 500000.0 * pow(abs(viewDir.y + 1.0), 4.0), 0.2 * smoothstep(0.1, -0.1, viewDir.y));

    float sunDotU = (dot(sunVector, vec3(0.0, 1.0, 0.0)));
    sunDotU = smoothstep(0.0, 1.0, sunDotU);
    sunDotU = pow(sunDotU, 1.0);
    float sunDotV = clamp01(dot(sunVector, viewDir));
    sunDotV = mix(frx_smootherstep(0.0, 1.5, sunDotV), sunDotV, frx_smootherstep(0.0, 1.0, sunDotV));
    sunDotV = clamp01(sunDotV);

    // -------


    // -------

    float sunOpticalDepth = particleThickness(sunDotU);

    vec3 dayScatterView = scatter(kTotal, opticalDepth);
    vec3 dayAbsorbView = absorb(kTotal, opticalDepth);

    vec3 dayScatterLight = scatter(kTotal, sunOpticalDepth);
    vec3 dayAbsorbLight = absorb(kTotal, sunOpticalDepth);

    vec3 absorbSun = abs(dayAbsorbLight - dayAbsorbView) / d0((dayScatterLight - dayScatterView) * ln2);

    vec3 rlhDayScatter = scatter(rayleigh, opticalDepth * mix(1.0, 1.0, pow((1.0 - clamp01(viewDir.y)), 6.0))) * 1.5 * rayleighPhase(sunDotV * 0.0);
    vec3 mieDayScatter = scatter(mie, particleThickness(pow(upDot, 2.0))) * miePhase(sunDotV, 20.0);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;

    if(frx_worldIsOverworld == 1) {
        totalScatter += 40.0 * scatter(mie, opticalDepth) * 
        miePhase(frx_smootherstep(0.9995, 0.9997, sunDotV), opticalDepth) * 
        smoothstep(-0.0, 0.01, unmodifiedViewDir.y) *
        frx_smootherstep(0.9985 , 0.9995, dot(viewDir, sunVector));// * vec3(1.1, 1.1, 0.9);
    }

    vec3 totalAbsorb = absorbSun * factor;

    return totalScatter * totalAbsorb;
}
vec3 endSecondAtmosphere(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness) {
    const float ln2 = log(2.0);

    vec3 viewDir = normalize(viewSpacePos);
    vec3 unmodifiedViewDir = viewDir;

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.5, 1.0, 0.3) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.6, 0.2));
        //sunVector.yz = rotate2D(sunVector.yz, frx_renderSeconds);
        //sunVector.y += sin(frx_renderSeconds);
        sunVector = normalize(sunVector);
    }

    //viewDir.y = mix(viewDir.y, viewDir.y, smoothstep(0.01, -0.0, viewDir.y));
    //viewDir.y = clamp01(viewDir.y + 0.5);

    // -------
    // Don't question my methods
    // -------

    float upDot = (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / SKY_GROUND_FOG) : viewDir.y);
    upDot = pow(upDot, 1.0) * (frx_worldIsEnd == 1 ? 50.0 : 1.0);
	float opticalDepth = particleThickness(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));
    //if(viewDir.y < 0.0) opticalDepth = mix(opticalDepth, 500000.0 * pow(abs(viewDir.y + 1.0), 4.0), 0.2 * smoothstep(0.1, -0.1, viewDir.y));

    float sunDotU = (dot(sunVector, vec3(0.0, 1.0, 0.0)));
    sunDotU = smoothstep(0.0, 1.0, sunDotU);
    sunDotU = pow(sunDotU, 1.0);
    float sunDotV = clamp01(dot(sunVector, viewDir));
    sunDotV = mix(frx_smootherstep(0.0, 1.5, sunDotV), sunDotV, frx_smootherstep(0.0, 1.0, sunDotV));
    sunDotV = clamp01(sunDotV);

    // -------


    // -------

    float sunOpticalDepth = particleThickness(sunDotU);

    vec3 dayScatterView = scatter(kTotal, opticalDepth);
    vec3 dayAbsorbView = absorb(kTotal, opticalDepth);

    vec3 dayScatterLight = scatter(kTotal, sunOpticalDepth);
    vec3 dayAbsorbLight = absorb(kTotal, sunOpticalDepth);

    vec3 absorbSun = abs(dayAbsorbLight - dayAbsorbView) / d0((dayScatterLight - dayScatterView) * ln2);

    vec3 rlhDayScatter = scatter(rayleigh, opticalDepth * mix(1.0, 1.0, pow((1.0 - clamp01(viewDir.y)), 6.0))) * 1.5 * rayleighPhase(sunDotV * 0.0);
    vec3 mieDayScatter = scatter(mie, particleThickness(pow(upDot, 2.0))) * miePhase(sunDotV, MIE_AMOUNT);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;

    if(frx_worldIsOverworld == 1) {
        totalScatter += mix(1.0, 1.0, (sunDotU * sunDotU)) *
        20.0 * scatter(mie, opticalDepth) * 
        miePhase(frx_smootherstep(0.9995, 0.9997, sunDotV), opticalDepth) * 
        smoothstep(-0.0, 0.01, unmodifiedViewDir.y) *
        frx_smootherstep(0.999, 0.9995, dot(viewDir, sunVector));
    }

    vec3 totalAbsorb = absorbSun * factor;

    return totalScatter * totalAbsorb * sunDotV;
}

vec3 getFogScattering(in vec3 viewDir, in vec3 sunVector, in float factor, in float sunBrightness, in float opticalDepth) {
    const float ln2 = log(2.0);

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.8, 0.3, 1.0) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.1, 0.2));
    }

    float sunDotU = sunVector.y;
    float sunDotV = clamp01(dot(sunVector, viewDir));
    float upDot = viewDir.y;

    float sunOpticalDepth = particleThickness(sunDotU);

    vec3 dayScatterView = scatter(kTotal, opticalDepth);
    vec3 dayAbsorbView = absorb(kTotal, opticalDepth);

    vec3 dayScatterLight = scatter(kTotal, sunOpticalDepth);
    vec3 dayAbsorbLight = absorb(kTotal, sunOpticalDepth);

    vec3 absorbSun = abs(dayAbsorbLight - dayAbsorbView) / d0((dayScatterLight - dayScatterView) * ln2);

    vec3 rlhDayScatter = scatter(rayleigh, opticalDepth) * 1.5 * rayleighPhase(sunDotV * 0.0);
    vec3 mieDayScatter = scatter(mie, particleThickness(pow(upDot, 2.0))) * miePhase(sunDotV, MIE_AMOUNT);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;    
    vec3 totalAbsorb = absorbSun * factor;

    return totalScatter * totalAbsorb;
}
vec3 getFogScattering(in vec3 viewDir, in float opticalDepth) {
    vec3 fogScattering;
    vec3 tdata = getTimeOfDayFactors();

    if(1.0 - tdata.y > 0.0) {
        vec3 sunVector = getSunVector();
        fogScattering += getFogScattering(viewDir, sunVector, 1.0 - tdata.y, 1.0 + 1.5 * pow(1.0 - sunVector.y, 5.0), opticalDepth) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
    }
    if(1.0 - tdata.x > 0.0) {
        vec3 moonVector = getMoonVector();
        fogScattering += getFogScattering(viewDir, moonVector, 1.0 - tdata.x, 0.1 + 0. * pow(1.0 - moonVector.y, 5.0), opticalDepth) * vec3(0.5, 0.7, 1.5) * 0.25;
    }

    return fogScattering;
}

vec3 atmosphericScatteringTop(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness) {
    const float ln2 = log(2.0);

    vec3 viewDir = normalize(viewSpacePos);
    vec3 unmodifiedViewDir = viewDir;

    //viewDir.y = mix(viewDir.y, viewDir.y, smoothstep(0.01, -0.0, viewDir.y));

    // -------
    // Don't question my methods
    // -------

    float upDot = (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / SKY_GROUND_FOG) : viewDir.y);
    upDot = pow(upDot, 1.0);
	float opticalDepth = particleThicknessConst(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));
    //if(viewDir.y < 0.0) opticalDepth = mix(opticalDepth, 500000.0 * pow(abs(viewDir.y + 1.0), 4.0), 0.2 * smoothstep(0.1, -0.1, viewDir.y));

    float sunDotU = (dot(sunVector, vec3(0.0, 1.0, 0.0)));
    sunDotU = smoothstep(0.0, 1.0, sunDotU);
    float sunDotV = clamp01(dot(sunVector, viewDir));
    sunDotV = mix(frx_smootherstep(0.0, 1.5, sunDotV), sunDotV, frx_smootherstep(0.0, 1.0, sunDotV));
    sunDotV = clamp01(sunDotV);

    // -------

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    // -------

    float sunOpticalDepth = particleThickness(sunDotU);

    vec3 dayScatterView = scatter(kTotal, opticalDepth);
    vec3 dayAbsorbView = absorb(kTotal, opticalDepth);

    vec3 dayScatterLight = scatter(kTotal, sunOpticalDepth);
    vec3 dayAbsorbLight = absorb(kTotal, sunOpticalDepth);

    vec3 absorbSun = abs(dayAbsorbLight - dayAbsorbView) / d0((dayScatterLight - dayScatterView) * ln2);

    vec3 rlhDayScatter = scatter(rayleigh, opticalDepth * mix(1.0, 1.0, pow((1.0 - clamp01(viewDir.y)), 6.0))) * 1.5 * rayleighPhase(sunDotV * 0.0);
    vec3 mieDayScatter = scatter(mie, particleThickness(pow(upDot, 2.0))) * miePhase(sunDotV, MIE_AMOUNT);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;

    vec3 totalAbsorb = absorbSun * factor;

    return totalScatter * totalAbsorb;
}

// vec3 waterFog(in vec3 color, in vec3 viewSpacePos) {

// }

vec3 getSkyColor(in vec3 viewDir) {
    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    if(1.0 - tdata.y > 0.0) {
        vec3 sunVector = getSunVector();
        atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
    }
    if(1.0 - tdata.x > 0.0) {
        vec3 moonVector = getMoonVector();
        atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS) * vec3(0.5, 0.7, 1.5) * 0.25;
    }

    if(frx_worldIsEnd == 1) {

    }

    return atmosphere;
}

vec3 getSkyColorDetailed(in vec3 viewDir, in vec3 viewPos) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();


    vec3 secondViewDir = viewDir;

    if(frx_worldIsOverworld == 1) {
        if(1.0 - tdata.y > 0.0) {
            vec3 sunVector = getSunVector();
            atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
        }
        if(1.0 - tdata.x > 0.0) {
            vec3 moonVector = getMoonVector();
            atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS) * vec3(0.5, 0.7, 1.5) * 0.25;
        }
    }

    if(frx_worldIsEnd == 1) {
        viewDir.zy = rotate2D(viewDir.zy, 2.8);

        //viewDir.y = -viewDir.y;

        secondViewDir = viewDir;
        
        viewDir.y = -viewDir.y;
        viewPos.y = -viewPos.y;
        viewDir.xy = rotate2D(viewDir.xy, -0.1);
        viewPos.xy = rotate2D(viewPos.xy, -0.1);

        viewDir.y += 0.2;
        viewDir = normalize(viewDir);

        atmosphere += atmosphericScattering(viewDir, vec3(0.0), 2.0, 1.0);

        secondViewDir.yz = rotate2D(secondViewDir.yz, 0.7);
        secondViewDir.xy = rotate2D(secondViewDir.xy, -0.74);
        secondViewDir.y += 0.95;
        secondViewDir = normalize(secondViewDir);
        
        atmosphere += endSecondAtmosphere(secondViewDir, normalize(vec3(1.0, 0.1, 0.2)), 1.0, 1.0);
        if(secondViewDir.y < 0.0) {
            atmosphere += vec3(0.09, 0.12, 0.03) * smoothstep(-0.0, 1.0, dot(normalize(vec3(1.0, 0.6, 0.2)), secondViewDir));
        } else if(viewDir.y < 0.0) {
            atmosphere += vec3(0.01, 0.0, 0.01);
        }
    }

    vec3 viewPosCopy = viewPos;

    if(viewDir.y > 0.0 && secondViewDir.y > 0.0) {
        viewPos.y = abs(viewPos.y);
        vec2 starPlane = viewPos.xz / (viewPos.y + 0.5 * length(viewPos.xz));
        starPlane *= 200.0;
        viewPos.y = viewPosCopy.y;

        vec3 ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);

        vec3 stars = vec3(step(1.0 - 1e-2, rand1D(floor(starPlane)))) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);
        stars = (stars) * normalize(rand3D(floor(starPlane)) * 0.3 + 0.7);

        atmosphere.rgb = mix(atmosphere.rgb + stars, atmosphere.rgb, clamp01(max(skyIlluminance * 2.0, frx_luminance(stars))));
    }

    return atmosphere;
}