// Canvas utility stuff
vec3 getSunVector() {
    vec3 sun = frx_worldIsMoonlit == 0 ? frx_skyLightVector : -frx_skyLightVector;
    return sun;
}
vec3 getMoonVector() {
    vec3 moon = frx_worldIsMoonlit == 1 ? frx_skyLightVector : -frx_skyLightVector;
    return moon;
}

vec3 getTimeOfDayFactors() {
    // vec3(dayFactor, nightFactor, sunsetFactor)
    float nightFactor = frx_worldIsMoonlit == 1.0 ? 1.0 : 0.0;
    nightFactor *= frx_skyLightTransitionFactor;
    float dayFactor = frx_worldIsMoonlit == 0.0 ? 1.0 : 0.0;
    dayFactor *= frx_skyLightTransitionFactor;
    float sunsetFactor = 1.0 - frx_skyLightTransitionFactor;

    return vec3(dayFactor, nightFactor, sunsetFactor);
}
float getWorldTime() {
    return frx_worldTime * 24000.0 + frx_worldDay * 24000.0;
}

// Space conversions
vec3 setupSceneSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = frx_inverseViewProjectionMatrix * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 sceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
    vec4 temp = frx_viewProjectionMatrix * vec4(sceneSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 setupViewSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = frx_inverseProjectionMatrix * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 viewSpaceToScreenSpace(in vec3 viewSpacePos) {
    vec4 temp = frx_projectionMatrix * vec4(viewSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 setupCleanSceneSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = frx_inverseCleanViewProjectionMatrix * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 cleanSceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
    vec4 temp = frx_cleanViewProjectionMatrix * vec4(sceneSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 setupLastFrameSceneSpacePos(in vec2 texcoord, in float depth) {
    vec3 screenSpacePos = vec3(texcoord, depth);
    vec3 clipSpacePos = screenSpacePos * 2.0 - 1.0;
    vec4 temp = (frx_lastViewProjectionMatrix) * vec4(clipSpacePos, 1.0);
    return temp.xyz / temp.w;
}
vec3 lastFrameSceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
    vec4 temp = frx_lastViewProjectionMatrix * vec4(sceneSpacePos, 1.0);
    return (temp.xyz / temp.w) * 0.5 + 0.5;
}
vec3 sceneSpaceToViewSpace(in vec3 sceneSpacePos) {
    // There's probably a faster way to do this but this is rarely needed
    vec3 screenPos = sceneSpaceToScreenSpace(sceneSpacePos);
    return setupViewSpacePos(screenPos.xy, screenPos.z);
}

// clamp01() functions for convenience
float clamp01(in float x) {
    return clamp(x, 0.0, 1.0);
}
vec2 clamp01(in vec2 x) {
    return clamp(x, vec2(0.0), vec2(1.0));
}
vec3 clamp01(in vec3 x) {
    return clamp(x, vec3(0.0), vec3(1.0));
}
vec4 clamp01(in vec4 x) {
    return clamp(x, vec4(0.0), vec4(1.0));
}
int clamp01(in int x) {
    return clamp(x, 0, 1);
}
ivec2 clamp01(in ivec2 x) {
    return clamp(x, ivec2(0), ivec2(1));
}
ivec3 clamp01(in ivec3 x) {
    return clamp(x, ivec3(0), ivec3(1));
}
ivec4 clamp01(in ivec4 x) {
    return clamp(x, ivec4(0), ivec4(1));
}

// "faster" normalize functions
vec2 fNormalize(in vec2 x) {
    float lengthSquared = dot(x, x);
    return x * inversesqrt(lengthSquared);
}
vec3 fNormalize(in vec3 x) {
    float lengthSquared = dot(x, x);
    return x * inversesqrt(lengthSquared);
}
vec4 fNormalize(in vec4 x) {
    float lengthSquared = dot(x, x);
    return x * inversesqrt(lengthSquared);
}
#define normalize(x) (fNormalize(x))

// Angle in radians
vec2 rotate2D(vec2 uv, float angle) {
	float s = sin(angle);
	float c = cos(angle);
	mat2 mat = mat2(c, s, -s, c);
	return mat * uv;
}

float rand1D(vec2 st) {
    return hash12(st) * 2.0 - 1.0;
}
vec2 rand2D(vec2 st) {
    return normalize(hash22(st) * 2.0 - 1.0);
}
vec3 rand3D(vec2 st) {
    return normalize(hash32(st) * 2.0 - 1.0);
}

void saturation(inout vec3 color, in float amt) {
    color = mix(vec3(frx_luminance(color)), color, amt);
}

// Thanks Belmu#4066 for helping me solve the issues with my variable penumbra shadows!
vec2 sincos(float x) {
    return vec2(sin(x), cos(x));
}
vec2 diskSampling(float i, float n, float phi){
    float theta = (i + phi) / n; 
    return sincos(theta * TAU * n * 1.618033988749894) * theta;
}

vec3 mixmax(in vec3 a, in vec3 b, in float x) {
    return mix(a, max(a, b), x);
}

vec3 getSeasonColor(in vec3 vertexColor, in int isLeafBlock, vec3 worldCoord) {
    #ifdef SEASONS
        float time = frx_worldDay + frx_worldTime;

        #if STARTING_SEASON == SEASON_SUMMER
            time += 6.0;
        #elif STARTING_SEASON == SEASON_AUTUMN
            time += 12.0;
        #elif STARTING_SEASON == SEASON_WINTER
            time += 18.0;
        #endif

        time = mod(time, 23.0);

        #ifdef VARIED_TREE_COLOR
            float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01));
        #else
            float noise = 0.0;
        #endif

        float leaves = float(isLeafBlock);

        vertexColor = mix(vertexColor, vec3(1.000,0.592,0.837) * 2.0, leaves * noise);
        vec3 seasonColor = vertexColor;
        seasonColor = mix(seasonColor, mix(vec3(0.880,1.000,0.568), vec3(0.874,1.000,0.537) * 1.5, leaves), smoothstep(4.0, 5.0, time));   // summer
        seasonColor = mix(seasonColor, mix(vec3(1.000,0.666,0.346), mix(vec3(1.000,0.480,0.105), vec3(1.000,0.341,0.158) * 1.5, noise), leaves), smoothstep(10.0, 11.0, time)); // autumn
        seasonColor = mix(seasonColor, mix(vec3(0.828,1.000,0.844), vec3(1.000,0.874,0.912), leaves), smoothstep(16.0, 17.0, time)); // winter
        seasonColor = mix(seasonColor, vertexColor, smoothstep(22.0, 23.0, time));             // spring

        return seasonColor;
    #else
        return vertexColor;
    #endif
}
float getLeavesFallingThreshold(vec3 worldCoord) {
    #ifdef SEASONS
        float time = frx_worldDay + frx_worldTime;

        #if STARTING_SEASON == SEASON_SUMMER
            time += 6.0;
        #elif STARTING_SEASON == SEASON_AUTUMN
            time += 12.0;
        #elif STARTING_SEASON == SEASON_WINTER
            time += 18.0;
        #endif

        time = mod(time, 23.0);

        #ifdef VARIED_TREE_COLOR
            float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01 + 1000.0));
        #else
            float noise = 0.0;
        #endif

        float threshold = 2.0;
        threshold = mix(threshold, 2.0, smoothstep(4.0, 5.0, time));   // summer
        threshold = mix(threshold, mix(0.75, 0.5, noise), smoothstep(10.0, 11.0, time)); // autumn
        threshold = mix(threshold, mix(0.5, 0.4, noise), smoothstep(16.0, 17.0, time)); // winter
        threshold = mix(threshold, 2.0, smoothstep(22.0, 23.0, time));             // spring

        return threshold;
    #else
        return 2.0;
    #endif
}