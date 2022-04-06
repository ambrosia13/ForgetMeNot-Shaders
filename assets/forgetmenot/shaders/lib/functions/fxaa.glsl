// Tutorial / reference:
// http://blog.simonrodriguez.fr/articles/2016/07/implementing_fxaa.html

float luma(in vec3 color) {
    return sqrt(frx_luminance(color));
}
float luma(in vec4 color) {
    return sqrt(frx_luminance(color.rgb));
}

float quality(in int i) {
    if(i <= 5) {
        return 1.0;
    }
    if(i == 6) {
        return 1.5;
    }
    if(i <= 10 && i >= 7) {
        return 2.0;
    }
    if(i == 11) {
        return 4.0;
    }
    if(i == 12) {
        return 8.0;
    }
}

#define EDGE_THRESHOLD_MIN 0.0212
#define EDGE_THRESHOLD_MAX 0.125

vec3 fxaa(in sampler2D image, in vec2 texcoord) {
    vec3 centerColor = texture(image, texcoord).rgb;
    float center = luma(centerColor);

    float down = luma(texture(image, texcoord + ivec2(0, -1) / frxu_size));
    float up = luma(texture(image, texcoord + ivec2(0, -1) / frxu_size));
    float left = luma(texture(image, texcoord + ivec2(0, -1) / frxu_size));
    float right = luma(texture(image, texcoord + ivec2(0, -1) / frxu_size));

    float lmin = min(center, min(min(down, up), min(left, right)));
    float lmax = max(center, max(max(down, up), max(left, right)));

    float lrange = lmax - lmin;

    if(lrange < max(EDGE_THRESHOLD_MIN, lmax * EDGE_THRESHOLD_MAX)) {
        // return centerColor;
    }

    float downLeft = luma(texture(image, texcoord + ivec2(-1, -1) / frxu_size));
    float upRight = luma(texture(image, texcoord + ivec2(1, 1) / frxu_size));
    float upLeft = luma(texture(image, texcoord + ivec2(-1, 1) / frxu_size));
    float downRight = luma(texture(image, texcoord + ivec2(1, -1) / frxu_size));

    float downUp = down + up;
    float leftRight = left + right;

    float leftCorners = downLeft + upLeft;
    float downCorners = downLeft + downRight; 
    float rightCorners = downRight + upRight;
    float upCorners = upRight + upLeft;

    float edgeHorizontal = abs(-2.0 * left + leftCorners) + abs(-2.0 * center + downUp) * 2.0 + abs(-2.0 * right + rightCorners);
    float edgeVertical = abs(-2.0 * up + upCorners) + abs(-2.0 * center + leftRight) * 2.0 + abs(-2.0 * down + downCorners);

    bool isHorizontal = edgeHorizontal >= edgeVertical;

    float luma1 = isHorizontal ? down : left;
    float luma2 = isHorizontal ? up : right;

    float grad1 = luma1 - center;
    float grad2 = luma2 - center;

    bool is1Steepest = abs(grad1) >= abs(grad2);
    
    float gradScaled = 0.25 * max(abs(grad1), abs(grad2));

    float stepLength = 1.0 / (isHorizontal ? frxu_size.y : frxu_size.x);
    float localAverage = 0.0;

    if(is1Steepest) {
        stepLength *= -1.0;
        localAverage = 0.5 * (luma1 + center);
    } else {
        localAverage = 0.5 * (luma2 + center);
    }

    vec2 currentUV = texcoord;
    if(isHorizontal) {
        currentUV.y += stepLength * 0.5;
    } else {
        currentUV.x += stepLength * 0.5;
    }

    vec2 offset = isHorizontal ? 1.0 / vec2(frxu_size.x, 0.0) : 1.0 / vec2(0.0, frxu_size.y);

    vec2 uv1 = currentUV - offset;
    vec2 uv2 = currentUV + offset;

    float lumaEnd1 = luma(texture(image, uv1));
    float lumaEnd2 = luma(texture(image, uv2));
    lumaEnd1 -= localAverage;
    lumaEnd2 -= localAverage;

    bool reached1 = abs(lumaEnd1) >= gradScaled;
    bool reached2 = abs(lumaEnd2) >= gradScaled;
    bool reachedBoth = reached1 && reached2;

    if(!reached1) {
        uv1 -= offset;
    }
    if(!reached2) {
        uv2 += offset;
    }

    if(!reachedBoth) {
        for(int i = 2; i < 12; i++) {
            if(!reached1) {
                lumaEnd1 = luma(texture(image, uv1));
                lumaEnd1 = lumaEnd1 - localAverage;
            }
            if(!reached2) {
                lumaEnd2 = luma(texture(image, uv2));
                lumaEnd2 = lumaEnd2 - localAverage;
            }

            reached1 = abs(lumaEnd1) >= gradScaled;
            reached2 = abs(lumaEnd2) >= gradScaled;
            reachedBoth = reached1 && reached2;

            if(!reached1) {
                uv1 -= offset * quality(i);
            }
            if(!reached2) {
                uv2 += offset * quality(i);
            }
            if(reachedBoth) break;
        }
    }

    float distance1 = isHorizontal ? (texcoord.x - uv1.x) : (texcoord.y - uv1.y);
    float distance2 = isHorizontal ? (uv2.x - texcoord.x) : (uv2.y - texcoord.y);

    bool isDirection1 = distance1 < distance2;
    float distanceFinal = min(distance1, distance2);

    float edgeThickness = distance1 + distance2;

    float pixelOffset = -distanceFinal / edgeThickness + 0.5;

    bool isLumaCenterSmaller = center < localAverage;
    bool correctVariation = ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != isLumaCenterSmaller;

    float finalOffset = correctVariation ? pixelOffset : 0.0;

    float lumaAverage = (1.0 / 12.0) * (2.0 * (downUp + leftRight) + leftCorners + rightCorners);

    float subPixelOffset1 = clamp01(abs(lumaAverage - center) / lrange);
    float subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;
    float subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * 0.75;

    finalOffset = max(finalOffset, subPixelOffsetFinal);

    vec2 finalUv = texcoord;
    if(!isHorizontal) {
        finalUv.y += finalOffset * stepLength;
    } else {
        finalUv.x += finalOffset * stepLength;
    }

    vec3 finalColor = texture(image, finalUv).rgb;
    return finalColor;
}