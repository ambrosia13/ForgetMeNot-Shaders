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
vec3 cleanLastFrameSceneSpaceToScreenSpace(in vec3 sceneSpacePos) {
    vec4 temp = frx_lastCleanViewProjectionMatrix * vec4(sceneSpacePos, 1.0);
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

	mat2 mat = mat2(
         c, s,
        -s, c
    );
    
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

vec3 sampleCubemapFaces(samplerCube u_cube) {
    const vec3[] FORWARD_VECS = vec3[] (
        vec3(1, 0, 0),
        vec3(-1, 0, 0),
        vec3(0, 1, 0),
        vec3(0, -1, 0),
        vec3(0, 0, 1),
        vec3(0, 0, -1)
    );

    vec3 color = vec3(0.0);
    color += textureLod(u_cube, FORWARD_VECS[0], 9).rgb * 0.1;
    color += textureLod(u_cube, FORWARD_VECS[1], 9).rgb * 0.1;
    color += textureLod(u_cube, FORWARD_VECS[2], 9).rgb * 0.5;
    color += textureLod(u_cube, FORWARD_VECS[3], 9).rgb * 0.1;
    color += textureLod(u_cube, FORWARD_VECS[4], 9).rgb * 0.1;
    color += textureLod(u_cube, FORWARD_VECS[5], 9).rgb * 0.1;

    return color;
}

float getRainReflectionFactor(in vec3 normal, in float skyLight) {
    float rainReflectionFactor = smoothstep(0.1, 0.5, fmn_rainFactor) * step(0.95, normal.y) * smoothstep(0.95, 1.0, skyLight);
    return rainReflectionFactor;
}

vec4 getSeasonFactors(out float time) {
    time = frx_worldDay + frx_worldTime;

    #if STARTING_SEASON == SEASON_SUMMER
        time += SEASON_LENGTH + TRANSITION_LENGTH;
    #elif STARTING_SEASON == SEASON_AUTUMN
        time += SEASON_LENGTH * 2.0 + TRANSITION_LENGTH * 2.0;
    #elif STARTING_SEASON == SEASON_WINTER
        time += SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 3.0;
    #endif

    time = mod(time, SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 4.0);

    float toSummer = smoothstep(SEASON_LENGTH, SEASON_LENGTH + TRANSITION_LENGTH, time);
    float toAutumn = smoothstep(SEASON_LENGTH * 2.0 + TRANSITION_LENGTH, SEASON_LENGTH * 2.0 + TRANSITION_LENGTH * 2.0, time);
    float toWinter = smoothstep(SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 2.0, SEASON_LENGTH * 3.0 + TRANSITION_LENGTH * 3.0, time);
    float toSpring = smoothstep(SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 3.0, SEASON_LENGTH * 4.0 + TRANSITION_LENGTH * 4.0, time);

    return vec4(toSummer, toAutumn, toWinter, toSpring);
}
vec4 getSeasonFactors() {
    float time; // Sometimes we just don't care about time
    return getSeasonFactors(time);
}

// Foliage and tree color depending on season.
vec3 getSeasonColor(in vec3 vertexColor, in int isLeafBlock, vec3 worldCoord) {
    #ifdef SEASONS
        float time = 0.0;
        vec4 seasonFactors = getSeasonFactors(time);

        float toSummer = seasonFactors.x;
        float toAutumn = seasonFactors.y;
        float toWinter = seasonFactors.z;
        float toSpring = seasonFactors.w;

        #ifdef VARIED_TREE_COLOR
            float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01));
        #else
            float noise = 0.0;
        #endif

        float leaves = float(isLeafBlock);

        vertexColor = mix(vertexColor, vec3(1.000,0.592,0.837) * 2.0, leaves * noise);
        vec3 seasonColor = vertexColor;

        seasonColor = mix(seasonColor, vec3(0.9, 1.0, 0.4), toSummer); // summer
        seasonColor = mix(seasonColor, mix(vec3(1.000,0.666,0.346), mix(vec3(1.000,0.480,0.105), vec3(1.000,0.341,0.158) * 1.5, noise), leaves), toAutumn); // autumn
        seasonColor = mix(seasonColor, mix(vec3(0.828,1.000,0.844), vec3(1.000,0.874,0.912), leaves), toWinter); // winter
        seasonColor = mix(seasonColor, vertexColor, toSpring); // spring

        return seasonColor;
    #else
        return vertexColor;
    #endif
}

// Threshold for leaves to be discarded based on season.
float getLeavesFallingThreshold(vec3 worldCoord) {
    #ifdef SEASONS
        float time = 0.0;
        vec4 seasonFactors = getSeasonFactors(time);

        float toSummer = seasonFactors.x;
        float toAutumn = seasonFactors.y;
        float toWinter = seasonFactors.z;
        float toSpring = seasonFactors.w;

        #ifdef VARIED_TREE_COLOR
            float noise = smoothstep(0.4, 0.7, smoothHash(worldCoord.xz * 0.01 + 1000.0));
        #else
            float noise = 0.0;
        #endif

        float threshold = 2.0;
        threshold = mix(threshold, 2.0, toSummer); // summer
        threshold = mix(threshold, mix(0.95, 0.9, noise), toAutumn); // autumn
        threshold = mix(threshold, mix(0.5, 0.4, noise), toWinter); // winter
        threshold = mix(threshold, 2.0, toSpring); // spring

        return threshold;
    #else
        return 2.0;
    #endif
}

// Season-dependent fog factor. To be added onto original fog factor.
float getSeasonFogFactor() {
    #ifdef SEASONS
        float time = 0.0;
        vec4 seasonFactors = getSeasonFactors(time);

        float toSummer = seasonFactors.x;
        float toAutumn = seasonFactors.y;
        float toWinter = seasonFactors.z;
        float toSpring = seasonFactors.w;

        float fog = 0.25;
        fog = mix(fog, 0.0, toSummer);   // summer
        fog = mix(fog, 0.25, toAutumn); // autumn
        fog = mix(fog, 0.75, toWinter); // winter
        fog = mix(fog, 0.25, toSpring); // spring

        return fog * (1.0 - sqrt(max(0.0001, getSunVector().y)));
    #else
        return 0.0;
    #endif
}

float getSeasonCloudsFactor() {
    #ifdef SEASONS
        float time = 0.0;
        vec4 seasonFactors = getSeasonFactors(time);

        float toSummer = seasonFactors.x;
        float toAutumn = seasonFactors.y;
        float toWinter = seasonFactors.z;
        float toSpring = seasonFactors.w;

        float lowerBound = 0.4;
        lowerBound = mix(lowerBound, 0.55, toSummer);   // summer
        lowerBound = mix(lowerBound, 0.35, toAutumn); // autumn
        lowerBound = mix(lowerBound, 0.20, toWinter); // winter
        lowerBound = mix(lowerBound, 0.40, toSpring); // spring

        return lowerBound;
    #else
        return 0.4;
    #endif
}