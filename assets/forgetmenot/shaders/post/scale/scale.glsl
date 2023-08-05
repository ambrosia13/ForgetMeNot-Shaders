#define NEIGHBOR_CLIP 0.0

const float phi2 = 1.32471795724474602596;
const vec2  a    = vec2(1.0/phi2, 1.0/(phi2*phi2));

vec2 R2(float n) {
    return fract(a * n + 0.5);
}

float sqmag(vec2 x) {
    return dot(x,x);
}

float maxc(vec3 v) {
    return max(max(v.x,v.y),v.z);
}
float minc(vec3 v) {
    return min(min(v.x,v.y),v.z);
}


struct neighborhoodInfo {
    vec3 maximum;
    vec3 minimum;
    vec3 mean;
    
    vec3 right;
    vec3 left;
    vec3 up;
    vec3 upright;
    vec3 upleft;
    vec3 down;
    vec3 downright;
    vec3 downleft;
};

neighborhoodInfo getNeighborhoodInfo(sampler2D s, vec2 co, float scale) {
    vec3 offs = vec3(scale / vec2(textureSize(s,0)), 0);
    
    vec3 r  = texture(s, (co * 0.5) + offs.xz).rgb;
    vec3 l  = texture(s, (co * 0.5) - offs.xz).rgb;
    vec3 u  = texture(s, (co * 0.5) + offs.zy).rgb;
    vec3 ur = texture(s, (co * 0.5) + offs.xy).rgb;
    vec3 ul = texture(s, (co * 0.5) + offs.zy - offs.xz).rgb;
    vec3 d  = texture(s, (co * 0.5) - offs.zy).rgb;
    vec3 dr = texture(s, (co * 0.5) - offs.zy + offs.xz).rgb;
    vec3 dl = texture(s, (co * 0.5) - offs.xy).rgb;
    
    vec3 ma = max(max(max(max(max(max(max(u,ur),ul),d),dr),dl),r),l);
    vec3 mi = min(min(min(min(min(min(min(u,ur),ul),d),dr),dl),r),l);
    vec3 m  = (r+l+u+ur+ul+d+dr+dl) / 8.;
    
    return neighborhoodInfo(ma,mi,m,r,l,u,ur,ul,d,dr,dl);
}

const float RESOLUTION = 0.5;
const float BLEND = 0.75;

vec2 jitter() {
    return (R2(float(frx_renderFrames % 1000u)) * 1.2 - 0.1) / (frxu_size * RESOLUTION);
}