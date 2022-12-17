// ---------------------------------------
// Original sky approximation from:
// https://www.shadertoy.com/view/MstBWs 
// by robobo1221
// The rest done by me
// ---------------------------------------
// A very simple atmospheric scattering model, without any raymarching
// Very fast, almost free

#define d0(x) (abs(x) + 1e-8)

const vec3 kRlh = (vec3(0.27, 0.5, 1.0) * 1e-5);
//const vec3 kRlh = (vec3(1.0, 0.7, 0.7) * 1e-5);
const vec3 kMie = vec3(0.5e-6);
const vec3 kTotal = kRlh + kMie;

const vec3 moonFlux = vec3(2.0, 2.0, 2.0) * 0.25;
const float atmosphereG = 0.75;
const float cloudsG = 0.5;

vec3 scatter(vec3 coeff, float depth) {
	return coeff * depth;
}

vec3 absorb(vec3 coeff, float depth) {
	return exp2(scatter(coeff, -depth));
}

float henyeyGreenstein(float x, float g) {
    float g2 = g * g;
    float x2 = x * x;

    float a = 3.0 * (1.0 - g2);
    float b = 2.0 * (2.0 + g2);
    float c = 1.0 + x2;
    float d = pow(1.0 + g2 - 2.0 * g * x, 1.5);

    return (a / b) * (c / d);
}

float rayleighPhase(float x) {
	return (3.0 / (16.0 * PI)) * (1.0 + x * x);
}
float miePhase(float x, float g) {
 	return henyeyGreenstein(x, g);
}
float particleThickness(float depth) {
   	float atmosphericDensity = 1.0;

    depth = depth * 2.0;
    depth = max(depth + 0.02, 0.02);
    depth = 1.0 / (depth);
    
	return 100000.0 * depth * atmosphericDensity;   
}

vec3 atmosphericScattering(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness, float drawSun, float vlFactor) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    const float ln2 = 0.693147181;

    vec3 viewDir = fNormalize(viewSpacePos);

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.8, 0.3, 1.0) * 1e-5;
        sunVector = fNormalize(vec3(1.0, 0.1, 0.2));
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
    //LdotV = mix(frx_smootherstep(0.0, 1.5, LdotV), LdotV, frx_smootherstep(0.0, 1.0, LdotV));

    float lightOpticalDepth = particleThickness(LdotU);

    vec3 scatterView = kTotal * opticalDepth;
    vec3 absorbView = exp2(-scatterView);

    vec3 scatterLight = kTotal * lightOpticalDepth;
    vec3 absorbLight = exp2(-scatterLight);

    vec3 absorbSun = abs(absorbLight - absorbView) / d0((scatterLight - scatterView) * ln2);

    vec3 rlhDayScatter = rayleigh * opticalDepth * 1.125;
    vec3 mieDayScatter = mie * particleThickness(upDot * upDot) * miePhase(LdotV, atmosphereG);

    vec3 scatterSun = rlhDayScatter * vec3(0.9, 1.0, 1.3) + mieDayScatter * 0.125;
    scatterSun += scatterSun * vlFactor * miePhase(LdotV, atmosphereG);

    vec3 totalScatter = scatterSun * sunBrightness * factor;
    vec3 totalAbsorb = absorbSun * factor;

    if(frx_worldIsOverworld == 1 && drawSun > 0.0) {
        float diskVisibility = step(0.9996, dot(viewDir, sunVector)) * 0.5;

        if(sunVector == getMoonVector()) {
            diskVisibility = step(0.9999, dot(viewDir, sunVector));
            // int phase = (int(frx_worldDay) % 8) - 4;

            // float rotateAmount = 10.0;
            // if(abs(phase) == 3) rotateAmount = 0.015;
            // if(abs(phase) == 2) rotateAmount = 0.01;
            // if(abs(phase) == 1) rotateAmount = 0.005;
            // if(phase == 0)  rotateAmount = 0.00;
            // rotateAmount *= sign(phase);
            
            // vec2 rotation = rotate2D(sunVector.xz, rotateAmount);
            // diskVisibility -= step(0.9999, dot(viewDir, fNormalize(vec3(rotation.x, sunVector.y, rotation.y))));

            diskVisibility *= 0.1;
        }

        totalScatter += 100.0 * drawSun * mix(80.0, 40.0, sqrt(LdotU)) * mie * opticalDepth * clamp01(diskVisibility);
    }


    return totalScatter * totalAbsorb;
}
vec3 endSecondAtmosphere(in vec3 viewSpacePos, in vec3 sunVector, in float factor, in float sunBrightness) {
    const float ln2 = log(2.0);

    vec3 viewDir = fNormalize(viewSpacePos);
    vec3 unmodifiedViewDir = viewDir;

    vec3 rayleigh = kRlh;
    vec3 mie = kMie;

    if(frx_worldIsEnd == 1) {
        viewDir.y = abs(viewDir.y);
        rayleigh = vec3(0.75, 1.0, 0.3) * 1e-5;
        sunVector = fNormalize(vec3(1.0, 0.6, 0.2));
        //sunVector.yz = rotate2D(sunVector.yz, frx_renderSeconds);
        //sunVector.y += sin(frx_renderSeconds);
        sunVector = fNormalize(sunVector);
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
        sunVector = fNormalize(vec3(1.0, 0.1, 0.2));
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

    float drawSun = 1.0;
    float vlFactor = mix(0.0, 1.0, fmn_rainFactor);

    if(1.0 - tdata.y > 0.0) {
        vec3 sunVector = getSunVector();
        atmosphere += atmosphericScattering(viewDir, sunVector,  1.0 - tdata.y, DAY_BRIGHTNESS, drawSun, vlFactor) * mix(vec3(1.0, 0.9, 1.2), vec3(1.0), sunVector.y);
    }
    if(1.0 - tdata.x > 0.0) {
        vec3 moonVector = getMoonVector();
        atmosphere += atmosphericScattering(viewDir, moonVector, 1.0 - tdata.x, NIGHT_BRIGHTNESS, drawSun, vlFactor) * moonFlux;
    }

    if(frx_worldIsEnd == 1) {

    }

    atmosphere *= mix(vec3(1.0), vec3(2.0, 1.0, 0.5), smoothstep(0.2, 0.1, frx_skyLightVector.y));

    return atmosphere;
}
vec3 getSkyColor(in vec3 viewDir, float drawSun) {
    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    float vlFactor = 0.0;//mix(0.0, 1.0, fmn_rainFactor);

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

        vec4 factors = getSeasonFactors();
        saturation(atmosphere, (1.0 - factors.z + factors.w) * 0.5 + 0.5);

        atmosphere = mix(atmosphere, min(mix(atmosphere, vec3(frx_luminance(atmosphere)), 0.5), atmosphere * 0.15 + 0.15), fmn_rainFactor);
    }

    if(frx_worldIsEnd == 1) {

    }

    return atmosphere + 2.0 * frx_skyFlashStrength;
}

vec3 getSkyColorDetailed(in vec3 viewDir, in vec3 viewPos, in float drawSun) {
    if(frx_worldIsNether == 1) return pow(frx_fogColor.rgb * 2.0, vec3(2.2));

    vec3 atmosphere;
    vec3 tdata = getTimeOfDayFactors();

    vec3 originalViewDir = viewDir;
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
        viewDir = fNormalize(viewDir);

        atmosphere += atmosphericScattering(viewDir, vec3(0.0), 1.5, 1.0, 1.0, 0.0) * vec3(3.5, 1.5, 7.0);

        secondViewDir.yz = rotate2D(secondViewDir.yz, 0.7);
        secondViewDir.xy = rotate2D(secondViewDir.xy, -0.74);
        secondViewDir.y += 0.95;
        secondViewDir = fNormalize(secondViewDir);
        
        atmosphere += endSecondAtmosphere(secondViewDir, fNormalize(vec3(1.0, 0.5, 0.2)), 1.0, 1.0);// * dot(secondViewDir, fNormalize(vec3(1.0, 0.6, 0.2)));
        if(secondViewDir.y < 0.0) {
            atmosphere += vec3(0.09, 0.12, 0.03) * smoothstep(0.95, 0.85, dot(originalViewDir, fNormalize(vec3(0.3, 0.25, -1.0))));
        } else if(viewDir.y < 0.0) {
            //atmosphere += vec3(0.01, 0.0, 0.01);
        }

        atmosphere *= 2.0;
    }

    vec3 viewPosCopy = viewPos;

    if(viewDir.y > 0.0 && secondViewDir.y > 0.0) {
        // viewPos.xy = rotate2D(viewPos.xy, -frx_skyAngleRadians);
        viewPos.y = abs(viewPos.y);
        vec2 starPlane = viewPos.xz / (viewPos.y + length(viewPos.xz));
        starPlane *= 200.0;
        viewPos.y = viewPosCopy.y;

        vec3 ambientLightColor = getSkyColor(vec3(0.0, 1.0, 0.0)) * 2.0;
        float skyIlluminance = frx_luminance(ambientLightColor * 8.0);

        vec3 stars = vec3(step(0.985 - 0.005 * (smoothHash(starPlane) * 0.5 + 0.5), 1.0 - cellular2x2(starPlane * 0.1).x)) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);
        starPlane += 100.0;
        stars += vec3(step(0.975 - 0.005 * (smoothHash(starPlane)), 1.0 - cellular2x2(starPlane * 0.1).x)) * (smoothHash(starPlane * 0.01) * 0.5 + 0.5);

        stars = (stars) * fNormalize(rand3D(floor(starPlane)) * 0.2 + 0.8);

        atmosphere.rgb = mix(atmosphere.rgb + mix(1.0, 4.0, clamp01(rand1D(floor(starPlane + 100.0)))) * stars, atmosphere.rgb, clamp01(max(skyIlluminance * 2.0, frx_luminance(stars))));
    }

    return atmosphere;
}

#if defined CLOUDS && !defined VERTEX_SHADER
    float sampleCumulusCloud(in sampler2D noiseTex, in vec2 plane) {
        plane *= 0.15;
        vec2 originalPlane = plane;

        vec2 secondPlane = rotate2D(plane * 1.0 + 100.5, PI / 4.0);

        plane = mix(fract(plane), 1.0 - fract(plane), mod(floor(plane), 2.0));
        secondPlane = mix(fract(secondPlane), 1.0 - fract(secondPlane), mod(floor(secondPlane), 2.0));

        float noiseA = texture(noiseTex, plane).r;
        float noiseB = texture(noiseTex, secondPlane).r;

        float aLowerBound = (getSeasonCloudsFactor() + 0.3) * (1.0 - fmn_rainFactor);
        float bLowerBound = (getSeasonCloudsFactor() + 0.1) * (1.0 - fmn_rainFactor);

        float a = smoothstep(aLowerBound, 0.9, noiseA);
        float b = smoothstep(bLowerBound, 0.9, noiseB);
        float x = smoothHash(originalPlane) * 0.5 + 0.5;

        return mix(a, b, x);
    }
    float sampleCirrusCloud(in sampler2D noiseTex, in vec2 plane) {
        plane *= vec2(0.15, 0.25);
        vec2 secondPlane = rotate2D(plane + 100.5, PI / 4.0);

        plane.x = mix(fract(plane.x), 1.0 - fract(plane.x), mod(floor(plane.x), 2.0));
        plane.y = mix(fract(plane.y), 1.0 - fract(plane.y), mod(floor(plane.y), 2.0));

        secondPlane.x = mix(fract(secondPlane.x), 1.0 - fract(secondPlane.x), mod(floor(secondPlane.x), 2.0));
        secondPlane.y = mix(fract(secondPlane.y), 1.0 - fract(secondPlane.y), mod(floor(secondPlane.y), 2.0));

        float clouds = texture(noiseTex, secondPlane).r * smoothstep(0.4, 1.4, texture(noiseTex, plane).r);
        return clouds;
    }

    vec3 getClouds(in vec3 viewDir, in vec3 skyColor, in sampler2D cumulusTex, in sampler2D cirrusTex) {
        if(frx_worldIsOverworld == 0 || viewDir.y < 0.0) {
            return skyColor;
        }

        vec3 tdata = getTimeOfDayFactors();
        float skyIlluminance = frx_luminance(getSkyColor(vec3(0.0, 1.0, 0.0)) * 12.0);

        // Color used for cloud shading
        vec3 skyLightColor = fNormalize(getSkyColor(frx_skyLightVector, 0.0 * exp(-frx_skyLightVector.y * 7.0))) * (skyIlluminance);
        saturation(skyLightColor, smoothstep(0.3, 0.2, getSunVector().y));

        float LdotV = clamp01(dot(frx_skyLightVector, viewDir));
        float nLdotV = clamp01(dot(-frx_skyLightVector, viewDir)) * (1.0 - frx_skyLightTransitionFactor);
        float phaseMie = max(0.0, henyeyGreenstein(LdotV, cloudsG) + henyeyGreenstein(nLdotV, cloudsG));

        vec3 mie = mix(phaseMie, 1.0, smoothstep(1.9, 0.1, phaseMie)) * skyLightColor;

        // 2D plane with curvature for the cloud plane
        vec2 plane = viewDir.xz / (viewDir.y + 0.1 * length(viewDir.xz));
        plane += fmn_time / 100.0;
        plane += frx_worldDay + frx_worldTime;
        
        // Cirrus clouds have no shading
        {
            vec2 cirrusPlane = plane;
            float cirrusClouds = sampleCirrusCloud(cirrusTex, cirrusPlane);
            float transmittanceCirrus = exp2(-cirrusClouds * 6.0);
            vec3 scatteringCirrus = (1.0 - transmittanceCirrus) * mie;

            skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittanceCirrus + scatteringCirrus, smoothstep(0.0, 0.1, viewDir.y));
        }

        // Cumulus clouds
        plane += frx_cameraPos.xz / 450.0;

        vec2 rayDirection = fNormalize(-viewDir.xz / viewDir.y);

        float opticalDepth = sampleCumulusCloud(cumulusTex, plane);
        float lightOpticalDepth = sampleCumulusCloud(cumulusTex, plane + 0.1 * rayDirection * (interleaved_gradient() * 0.5 + 0.5));

        float transmittance = exp2(-opticalDepth * 8.0 * mix(4.0, 16.0, smoothstep(0.8, 1.0, dot(viewDir, abs(frx_skyLightVector)))));
        vec3 scattering = vec3(exp2(-lightOpticalDepth * (4.0 + 3.0 * fmn_rainFactor))) * mie;
        scattering *= (1.0 - transmittance);

        skyColor.rgb = mix(skyColor.rgb, skyColor.rgb * transmittance + scattering, smoothstep(0.0, 0.05, viewDir.y));

        #ifdef CLOUD_LIGHT_RAYS
            float lightRaysOpticalDepth = 0.0;

            rayDirection = fNormalize(frx_skyLightVector.xz / frx_skyLightVector.y - viewDir.xz / viewDir.y);

            vec2 planeMarch = plane;
            float stepLength = 0.5;

            for(int i = 0; i < 2; i++) {
                planeMarch += rayDirection * stepLength * interleaved_gradient();
                lightRaysOpticalDepth += sampleCumulusCloud(cumulusTex, planeMarch) * 10.0;
            }

            float lightRays = exp2(-lightRaysOpticalDepth * 50.0);
            lightRays *= smoothstep(0.4, 0.0, frx_skyLightVector.y) * (getTimeOfDayFactors().x);

            skyColor.rgb = mix(skyColor.rgb, skyColor.rgb + (0.25 * skyLightColor * henyeyGreenstein(LdotV, 0.75)) * lightRays, smoothstep(0.0, 0.1, viewDir.y));
        #endif

        return skyColor;
    }
#endif