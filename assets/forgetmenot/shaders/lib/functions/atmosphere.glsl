// ---------------------------------------
// Original sky approximation from:
// https://www.shadertoy.com/view/MstBWs 
// by robobo1221
// The rest done by me
// ---------------------------------------
// A very simple atmospheric scattering model, without any raymarching
// Very fast, almost free

#define d0(x) (abs(x) + 1e-8)
#define d02(x) (abs(x) + 1e-3)
const vec3 kRlh = (vec3(0.27, 0.5, 1.0) * 1e-5);
//const vec3 kRlh = (vec3(1.0, 0.7, 0.7) * 1e-5);
const vec3 kMie = vec3(0.5e-6);
const vec3 kTotal = kRlh + kMie;

const vec3 moonFlux = vec3(1.3, 1.7, 2.0) * 0.25;
const float atmosphereG = 0.75;

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
float miePhase(float x, float g)
{
    //return kleinNishina(pow(x, 1.0 / mieAmount), SUN_ENERGY);
 	return henyeyGreenstein(x, g);
}
float particleThickness(float depth){
   	float atmosphericDensity = 1.0;

    depth = depth * 2.0;
    depth = max(depth + 0.02, 0.02);
    // depth = abs(depth);
    // if(depth < 0.01) depth = 0.01;
    depth = 1.0 / (depth);
    
	return 100000.0 * depth * atmosphericDensity;   
}

float particleThicknessConst(const float depth){
	return 100000.0 / max(depth * 2.0 - 0.01, 0.01);   
}

vec3 atmosphericScattering(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    const float ln2 = 0.693147181;

    vec3 viewDir = normalize(viewSpacePos);

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.6, 0.1, 1.2) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.1, 0.2));
    }

    #ifndef HIDE_SKY_GROUND
        float upDot = mix(pow(-viewDir.y, 1.0 / 1.5), viewDir.y, step(0.0, viewDir.y));
    #else
        // add padding to the atmosphere to hide the sky ground
        float upDot = frx_worldIsEnd == 0 ? mix(viewDir.y, 0.005, smoothstep(0.01, -0.0, viewDir.y)) : (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / 1.5) : viewDir.y);;
    #endif
    
    if(frx_worldIsEnd == 1) upDot *= 50.0;

	float opticalDepth = particleThickness(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));

    float LdotU = sunVector.y;
    LdotU = smoothstep(0.0, 1.0, LdotU);

    float LdotV = clamp01(dot(sunVector, viewDir));
    LdotV = mix(frx_smootherstep(0.0, 1.5, LdotV), LdotV, frx_smootherstep(0.0, 1.0, LdotV));

    float lightOpticalDepth = particleThickness(LdotU);

    vec3 scatterView = kTotal * opticalDepth;
    vec3 absorbView = exp2(-scatterView);

    vec3 scatterLight = kTotal * lightOpticalDepth;
    vec3 absorbLight = exp2(-scatterLight);

    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);

    vec3 rlhDayScatter = rayleigh * opticalDepth * 1.125;
    vec3 mieDayScatter = mie * particleThickness(upDot * upDot) * miePhase(LdotV, atmosphereG);

    float blueHourFactor = abs(mod(getWorldTime(), 12000.0) / 12000.0 - 12000.0) / 12000.0;
    blueHourFactor = blueHourFactor * blueHourFactor * (3.0 - 2.0 * blueHourFactor);
    blueHourFactor = blueHourFactor * blueHourFactor;

    vec3 mieMult = mix(vec3(1.0), vec3(1.5, 1.3, 1.7), 0.0 * blueHourFactor);
    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375 * mieMult;

    vec3 totalScatter = scatterSun * sunBrightness * factor;
    vec3 totalAbsorb = absorbSun * factor;

    if(frx_worldIsOverworld == 1) {
        float diskVisibility = step(0.9995, dot(viewDir, sunVector));

        if(sunVector == getMoonVector()) {
            diskVisibility = step(0.9999, dot(viewDir, sunVector)) * 0.5;
            int phase = (int(frx_worldDay) % 8) - 4;

            float rotateAmount = 10.0;
            if(abs(phase) == 3) rotateAmount = 0.015;
            if(abs(phase) == 2) rotateAmount = 0.01;
            if(abs(phase) == 1) rotateAmount = 0.005;
            if(phase == 0)  rotateAmount = 0.00;
            rotateAmount *= sign(phase);
            
            vec2 rotation = rotate2D(sunVector.xz, rotateAmount);
            diskVisibility -= step(0.9999, dot(viewDir, normalize(vec3(rotation.x, sunVector.y, rotation.y))));
        }

        totalScatter += 5.0 * mie * opticalDepth * miePhase(LdotV, 0.99) * clamp01(diskVisibility);
    }


    return totalScatter * totalAbsorb * (1.0 + frx_worldIsEnd);
}
vec3 atmosphericScattering(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness, float drawSun, float vlFactor) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    const float ln2 = 0.693147181;

    vec3 viewDir = normalize(viewSpacePos);

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.8, 0.3, 1.0) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.1, 0.2));
    }

    #ifndef HIDE_SKY_GROUND
        float upDot = mix(pow(-viewDir.y, 1.0 / 1.5), viewDir.y, step(0.0, viewDir.y));
    #else
        // add padding to the atmosphere to hide the sky ground
        float upDot = frx_worldIsEnd == 0 ? mix(viewDir.y, 0.005, smoothstep(0.01, -0.0, viewDir.y)) : (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / 1.5) : viewDir.y);;
    #endif
    
    if(frx_worldIsEnd == 1) upDot *= 50.0;

	float opticalDepth = particleThickness(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));

    float LdotU = sunVector.y;
    LdotU = smoothstep(0.0, 1.0, LdotU);

    float LdotV = clamp01(dot(sunVector, viewDir));
    LdotV = mix(frx_smootherstep(0.0, 1.5, LdotV), LdotV, frx_smootherstep(0.0, 1.0, LdotV));

    float lightOpticalDepth = particleThickness(LdotU);

    vec3 scatterView = kTotal * opticalDepth;
    vec3 absorbView = exp2(-scatterView);

    vec3 scatterLight = kTotal * lightOpticalDepth;
    vec3 absorbLight = exp2(-scatterLight);

    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);

    vec3 rlhDayScatter = rayleigh * opticalDepth * 1.125;
    vec3 mieDayScatter = mie * particleThickness(upDot * upDot) * miePhase(LdotV, atmosphereG);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;
    scatterSun += scatterSun * vlFactor * miePhase(LdotV, atmosphereG);

    vec3 totalScatter = scatterSun * sunBrightness * factor;
    vec3 totalAbsorb = absorbSun * factor;

    if(frx_worldIsOverworld == 1 && drawSun > 0.0) {
        float diskVisibility = step(0.9996, dot(viewDir, sunVector)) * 0.5;

        if(sunVector == getMoonVector()) {
            diskVisibility = step(0.9999, dot(viewDir, sunVector));
            int phase = (int(frx_worldDay) % 8) - 4;

            float rotateAmount = 10.0;
            if(abs(phase) == 3) rotateAmount = 0.015;
            if(abs(phase) == 2) rotateAmount = 0.01;
            if(abs(phase) == 1) rotateAmount = 0.005;
            if(phase == 0)  rotateAmount = 0.00;
            rotateAmount *= sign(phase);
            
            vec2 rotation = rotate2D(sunVector.xz, rotateAmount);
            diskVisibility -= step(0.9999, dot(viewDir, normalize(vec3(rotation.x, sunVector.y, rotation.y))));
        }

        totalScatter += drawSun * mix(80.0, 40.0, sqrt(LdotU)) * mie * opticalDepth * miePhase(frx_smootherstep(0.9996, 0.9998, LdotV), atmosphereG) * clamp01(diskVisibility);
    }


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
        rayleigh = vec3(0.75, 1.0, 0.3) * 1e-5;
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

    float upDot = (viewDir.y < 0.0 ? pow(-viewDir.y, 1.0 / 1.5) : viewDir.y);
    upDot = pow(upDot, 1.0) * (frx_worldIsEnd == 1 ? 50.0 : 1.0);
	float opticalDepth = particleThickness(upDot + 0.0615 + 0.05 * pow(1.0 - viewDir.y, 3.0));
    //if(viewDir.y < 0.0) opticalDepth = mix(opticalDepth, 500000.0 * pow(abs(viewDir.y + 1.0), 4.0), 0.2 * smoothstep(0.1, -0.1, viewDir.y));

    float LdotU = (dot(sunVector, vec3(0.0, 1.0, 0.0)));
    LdotU = smoothstep(0.0, 1.0, LdotU);
    LdotU = pow(LdotU, 1.0);
    float LdotV = clamp01(dot(sunVector, viewDir));
    LdotV = mix(frx_smootherstep(0.0, 1.5, LdotV), LdotV, frx_smootherstep(0.0, 1.0, LdotV));
    LdotV = clamp01(LdotV);

    // -------


    // -------

    float lightOpticalDepth = particleThickness(LdotU);

    vec3 scatterView = scatter(kTotal, opticalDepth);
    vec3 absorbView = absorb(kTotal, opticalDepth);

    vec3 scatterLight = scatter(kTotal, lightOpticalDepth);
    vec3 absorbLight = absorb(kTotal, lightOpticalDepth);

    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);

    vec3 rlhDayScatter = scatter(rayleigh, opticalDepth * mix(1.0, 1.0, pow((1.0 - clamp01(viewDir.y)), 6.0))) * 1.5 * rayleighPhase(LdotV * 0.0);
    vec3 mieDayScatter = scatter(mie, particleThickness(pow(upDot, 2.0))) * miePhase(LdotV, atmosphereG);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;

    if(frx_worldIsOverworld == 1) {
        totalScatter += mix(1.0, 1.0, (LdotU * LdotU)) *
        20.0 * scatter(mie, opticalDepth) * 
        miePhase(frx_smootherstep(0.9995, 0.9997, LdotV), atmosphereG) * 
        smoothstep(-0.0, 0.01, unmodifiedViewDir.y) *
        frx_smootherstep(0.999, 0.9995, dot(viewDir, sunVector));
    }

    vec3 totalAbsorb = absorbSun * factor;

    return totalScatter * totalAbsorb * LdotV;
}

vec3 getFogScattering(in vec3 viewDir, in vec3 sunVector, in float factor, in float sunBrightness, in float opticalDepth, in float lightOpticalDepth) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));
    const float ln2 = log(2.0);

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.8, 0.3, 1.0) * 1e-5;
        sunVector = normalize(vec3(1.0, 0.1, 0.2));
    }

    float LdotU = sunVector.y;
    float LdotV = clamp01(dot(sunVector, viewDir));
    float upDot = viewDir.y;

    //float lightOpticalDepth = particleThickness(LdotU);

    vec3 scatterView = kTotal * opticalDepth;
    vec3 absorbView = exp2(-scatterView);

    vec3 scatterLight = kTotal * lightOpticalDepth;
    vec3 absorbLight = exp2(-scatterLight);

    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);

    vec3 rlhDayScatter = rayleigh * opticalDepth * 1.125;
    vec3 mieDayScatter = mie * particleThickness(upDot * upDot) * miePhase(LdotV, atmosphereG);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.375;

    // -------

    vec3 totalScatter = scatterSun * sunBrightness * factor;    
    vec3 totalAbsorb = absorbSun * factor;

    vec3 fogScattering = totalScatter * totalAbsorb;

    fogScattering = mix(fogScattering, mix(vec3(0.1, 0.2, 0.4), vec3(0.1, 0.05, 0.025), smoothstep(0.0, -10.0, frx_cameraPos.y)), 1.0 - frx_smoothedEyeBrightness.y);
    fogScattering = mix(fogScattering, vec3(0.0, 0.5, 0.4) * max(0.1, LdotU) * max(0.1, frx_smoothedEyeBrightness.y), frx_cameraInWater);

    return fogScattering;
}
vec3 getFogScattering(in vec3 viewDir, in float opticalDepth) {
    vec3 fogScattering;
    vec3 tdata = getTimeOfDayFactors();

    float lightOpticalDepth = particleThickness(max(0.05, frx_skyLightVector.y));

    if(1.0 - tdata.y > 0.0) {
        vec3 sunVector = getSunVector();
        fogScattering += getFogScattering(viewDir, sunVector, 1.0 - tdata.y, DAY_BRIGHTNESS, opticalDepth, lightOpticalDepth) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
    }
    if(1.0 - tdata.x > 0.0) {
        vec3 moonVector = getMoonVector();
        fogScattering += getFogScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS, opticalDepth, lightOpticalDepth) * vec3(0.125, 0.175, 0.375);
    }

    return fogScattering;
}

vec3 getSkyColor(in vec3 viewDir) {
    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    if(1.0 - tdata.y > 0.0) {
        vec3 sunVector = getSunVector();
        atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
    }
    if(1.0 - tdata.x > 0.0) {
        vec3 moonVector = getMoonVector();
        atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS) * moonFlux;
    }

    if(frx_worldIsEnd == 1) {

    }

    return atmosphere;
}
vec3 getSkyColor(in vec3 viewDir, float drawSun) {
    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    float vlFactor = mix(0.0, 1.0, fmn_rainFactor);

    if(frx_worldIsNether == 1) {
        return pow(frx_fogColor.rgb * 2.0, vec3(2.2));
    }

    if(frx_worldIsOverworld == 1) {
        drawSun *= mix(1.0, 0.0, fmn_rainFactor);

        if(1.0 - tdata.y > 0.0) {
            vec3 sunVector = getSunVector();
            atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS, drawSun, vlFactor) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
        }
        if(1.0 - tdata.x > 0.0) {
            vec3 moonVector = getMoonVector();
            atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS, drawSun, vlFactor) * moonFlux;
        }

        atmosphere = mix(atmosphere, min(mix(atmosphere, vec3(frx_luminance(atmosphere)), 0.5), atmosphere * 0.15 + 0.15), fmn_rainFactor);
    }

    if(frx_worldIsEnd == 1) {

    }

    return atmosphere + 2.0 * frx_skyFlashStrength;
}
vec3 getSkyColor(in vec3 viewDir, float drawSun, float vlFactor) {
    #ifdef WHITE_SKY
        return vec3(1.0);
    #endif

    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    if(frx_worldIsNether == 1) {
        return pow(frx_fogColor.rgb * 2.0, vec3(2.2));
    }

    if(frx_worldIsOverworld == 1) {
        drawSun *= mix(1.0, 0.0, fmn_rainFactor);

        if(1.0 - tdata.y > 0.0) {
            vec3 sunVector = getSunVector();
            atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS, drawSun, vlFactor) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
        }
        if(1.0 - tdata.x > 0.0) {
            vec3 moonVector = getMoonVector();
            atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS, drawSun, vlFactor) * moonFlux;
        }

        atmosphere = mix(atmosphere, min(mix(atmosphere, vec3(frx_luminance(atmosphere)), 0.5), atmosphere * 0.15 + 0.15), fmn_rainFactor);
    }

    if(frx_worldIsEnd == 1) {

    }

    return atmosphere + 2.0 * frx_skyFlashStrength;
}

vec3 getSkyColorDetailed(in vec3 viewDir, in vec3 viewPos, in float drawSun) {
    #ifdef WHITE_SKY
        return vec3(1.0);
    #endif

    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();


    vec3 secondViewDir = viewDir;

    if(frx_worldIsOverworld == 1) {
        atmosphere = getSkyColor(viewDir, drawSun);
    }

    if(frx_worldIsEnd == 1) {
        viewDir.zy = rotate2D(viewDir.zy, 2.4);
        viewDir.xy = rotate2D(viewDir.xy, 0.3);

        //viewDir.y = -viewDir.y;

        secondViewDir = viewDir;
        
        viewDir.y = -viewDir.y;
        viewPos.y = -viewPos.y;
        viewDir.xy = rotate2D(viewDir.xy, -0.1);
        viewPos.xy = rotate2D(viewPos.xy, -0.1);

        viewDir.y += 0.4;
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

        atmosphere *= 2.0;
    }

    vec3 viewPosCopy = viewPos;

    if(viewDir.y > 0.0 && secondViewDir.y > 0.0) {
        viewPos.xy = rotate2D(viewPos.xy, -frx_skyAngleRadians);
        viewPos.y = abs(viewPos.y);
        vec2 starPlane = viewPos.xz / (viewPos.y + length(viewPos.xz));
        starPlane *= 200.0;
        viewPos.y = viewPosCopy.y;

        vec3 ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);

        vec3 stars = vec3(step(0.985 - 0.005 * (smoothHash(starPlane) * 0.5 + 0.5), 1.0 - cellular2x2(starPlane * 0.1).x)) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);
        starPlane += 100.0;
        stars += vec3(step(0.975 - 0.005 * (smoothHash(starPlane)), 1.0 - cellular2x2(starPlane * 0.1).x)) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);

        stars = (stars) * normalize(rand3D(floor(starPlane)) * 0.2 + 0.8);

        atmosphere.rgb = mix(atmosphere.rgb + stars, atmosphere.rgb, clamp01(max(skyIlluminance * 2.0, frx_luminance(stars))));
    }

    return atmosphere;
}
