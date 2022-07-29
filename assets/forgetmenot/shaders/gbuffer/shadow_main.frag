#include forgetmenot:shaders/lib/includes.glsl 
#define SHADOW_MAP_SIZE 2048
#define SHADOW_FILTER_SIZE PCF_SIZE_LARGE
#include canvas:shaders/pipeline/shadow.glsl

uniform sampler2D u_glint;
uniform sampler2DArray u_shadow_color;

in vec4 shadowViewPos;

layout(location = 0) out vec4 fragColor;
layout(location = 1) out vec4 fragNormal;
layout(location = 2) out vec4 pbrData;
layout(location = 3) out vec4 vertexNormal;

// Generated using https://drdesten.github.io/web/tools/sample_optimizer/
const vec2 vogel_disk_100_progressive[100] = vec2[](
   vec2(0.802975113911645, -0.5421872232224271),
   vec2(-0.12659380852311528, -0.2378330969223967),
   vec2(-0.5343958613684948, 0.1459723732135828),
   vec2(0.6175303935576036, 0.5824395094050758),
   vec2(-0.2092584962467774, -0.03174490674437301),
   vec2(-0.3933545095260579, 0.8240835100355938),
   vec2(0.10441103674262797, -0.7458087156452786),
   vec2(0.541929717449641, -0.7503824321464575),
   vec2(0.9373667269311896, 0.31448009425469514),
   vec2(-0.2852716558409651, 0.12280824810395237),
   vec2(0.136972578149145, -0.2882867833670201),
   vec2(0.4591707604630521, 0.06703511933830861),
   vec2(-0.9053445788107324, 0.4126596958602872),
   vec2(0.3584843720799928, -0.07368829111424324),
   vec2(-0.7124951102512045, 0.09395554279156541),
   vec2(0.3102326689084966, 0.26698026667267816),
   vec2(-0.05096393051766167, -0.38523121399805427),
   vec2(-0.41834200337763855, 0.022489151518993167),
   vec2(-0.2028213608241499, 0.48895370217544093),
   vec2(0.7904317799033407, 0.4738556824664317),
   vec2(0.23797769108462796, -0.8481362690826344),
   vec2(-0.6182051140306448, -0.05205622692804361),
   vec2(0.053136016517502625, -0.9498540714250977),
   vec2(0.20363824759206267, 0.7947494402990383),
   vec2(0.24572275636589133, 0.4346679792411917),
   vec2(-0.3897365185215919, 0.27611628850557973),
   vec2(-0.4804330082480799, -0.8518477026869575),
   vec2(0.43339469087125637, 0.6351640828396103),
   vec2(-0.328446896787534, -0.7140762531788803),
   vec2(0.480411706232945, 0.2578896458374349),
   vec2(-0.6812040408733541, 0.6696321991786652),
   vec2(-0.06561154981224762, -0.8318995334220843),
   vec2(0.09619005339406991, 0.567055451389332),
   vec2(0.3031752064669318, -0.4668766633635911),
   vec2(-0.747736068058373, 0.4704387955146294),
   vec2(0.10602831992832058, -0.4677430736120528),
   vec2(0.00257800101282861, -0.5989404452155079),
   vec2(0.4110747348347061, 0.4587615750806361),
   vec2(-0.5798277122124464, 0.48398212595147916),
   vec2(0.5002606249163773, -0.3747555397946381),
   vec2(-0.35249444554802356, 0.6060439331637977),
   vec2(-0.343476374114855, -0.5400269206652127),
   vec2(0.6283668850799324, 0.17751516491833153),
   vec2(-0.5871576383388775, 0.3063347922350601),
   vec2(0.23152011957960197, -0.6202770164998038),
   vec2(0.25395995379778097, 0.6299579525794694),
   vec2(-0.6165803598879195, -0.28682929346007296),
   vec2(0.658241419822445, -0.19785203506721308),
   vec2(-0.11427367615962436, 0.6313242820427992),
   vec2(-0.1480838134410211, -0.6826764291172875),
   vec2(0.5789726634765814, 0.41674200263871325),
   vec2(-0.21937198329072802, 0.31671355748702457),
   vec2(-0.26533018400699976, -0.8693213144461177),
   vec2(0.4028486887020116, 0.8004501092477652),
   vec2(-0.5185507869786382, -0.5206164693389972),
   vec2(0.7436420833966365, 0.043246462941773686),
   vec2(-0.8517980138131789, -0.0031026430752492187),
   vec2(-0.06655559217433263, 0.25141466517832006),
   vec2(0.11078516209594887, 0.9339913480191314),
   vec2(-0.752088438869848, -0.167764170634302),
   vec2(0.6763801789049836, -0.3782144913510417),
   vec2(0.19750893526206303, -0.12066922110121218),
   vec2(-0.18105329497560146, -0.49714308885311675),
   vec2(0.7332114728426775, 0.316427037180863),
   vec2(-0.7574079280988955, 0.2733322397510345),
   vec2(0.37964199219833034, -0.7093521752535393),
   vec2(-0.08421459775754998, 0.8642564401592312),
   vec2(-0.6892496713982121, -0.4425047561371579),
   vec2(0.8159939145419608, -0.13099823669313712),
   vec2(-0.5140350802760463, 0.6618228074757595),
   vec2(-0.4579754675842393, -0.34919133327379837),
   vec2(-0.02076681157982351, 0.4463213594033637),
   vec2(0.10112287501543944, 0.32877746083700976),
   vec2(0.6374128903114408, -0.5677124130718999),
   vec2(-0.4049774384757744, 0.4425742917507414),
   vec2(-0.5222933596593345, -0.6894860533873581),
   vec2(0.859375966734811, 0.16594735218138074),
   vec2(0.5849923227135485, -0.043291342650915346),
   vec2(-0.29046262480771146, -0.34242418514359524),
   vec2(0.02628669837016603, 0.7361557314609745),
   vec2(-0.8401021705540822, -0.31078358507462206),
   vec2(0.8374264316601335, -0.3310964559843498),
   vec2(-0.24236273911715742, 0.7511531464428333),
   vec2(0.4692741883630446, -0.5465516834034039),
   vec2(-0.09067809652408276, 0.08793499209483965),
   vec2(-0.9053583823961457, 0.1949271420230519),
   vec2(0.11345926658003067, 0.15367377039867616),
   vec2(0.3045098376852012, -0.29819071980595696),
   vec2(-0.7137592970054997, -0.6080445504716869),
   vec2(0.9452036800678609, -0.02465983100524771),
   vec2(0.013453999460760077, -0.1523038066739964),
   vec2(-0.4814554917510566, -0.14827497700903658),
   vec2(0.6086113200102704, 0.7496122817363862),
   vec2(-0.9573841243430771, -0.13307937428114158),
   vec2(0.0703414567695912, 0.005204664737679981),
   vec2(-0.22414712032372236, 0.9564793106367956),
   vec2(0.4669448664835479, -0.21070629680242894),
   vec2(0.27348764328441943, 0.10521675247270414),
   vec2(-0.30626757813662625, -0.1720696856762168),
   vec2(0.39368469469427825, -0.9111585335908577)
);
const vec2 vogel_disk_36_progressive[36] = vec2[](
   vec2(-0.2964435291594782, -0.8518186228220856),
   vec2(-0.47014079726841745, 0.18143360543969614),
   vec2(0.12254772374917625, -0.014572366837424501),
   vec2(0.980299166989105, -0.09539904581841668),
   vec2(-0.6919247098295398, 0.014235111131430805),
   vec2(0.8059981395214326, 0.4065692683288336),
   vec2(-0.7971138571185701, -0.27037176974861876),
   vec2(0.3344935212366293, -0.22436217656891141),
   vec2(-0.10561402449069676, 0.3957776338969755),
   vec2(0.46112470127389, 0.1521144460542824),
   vec2(-0.7579804835072077, -0.6052323635232217),
   vec2(0.4148498897430098, 0.7011998240017616),
   vec2(-0.20567771840533447, -0.41963530293755225),
   vec2(0.6027859159331788, -0.14606062659062985),
   vec2(-0.36030800968468907, 0.5046091210781497),
   vec2(0.18202582901372524, -0.8028185974203125),
   vec2(0.16562871812330743, 0.9218456109153287),
   vec2(-0.14581819840694699, 0.12331151209117494),
   vec2(0.23359959271509925, -0.5037247803452579),
   vec2(-0.02929939016651492, 0.7206221242720484),
   vec2(-0.47879241221299473, -0.5939537833062165),
   vec2(0.7705965632382776, 0.08847839083028985),
   vec2(-0.885347806480967, 0.22004048062241355),
   vec2(0.027735294901124388, -0.2770864858568851),
   vec2(0.5223664106473518, 0.42172030305423897),
   vec2(-0.5051340010945193, -0.31002961752725244),
   vec2(0.7835534066057706, -0.37442396940427264),
   vec2(-0.33272363890705886, 0.791676028892177),
   vec2(-0.07962792172957851, -0.6652988313969814),
   vec2(0.19441074009990866, 0.2328761425975691),
   vec2(-0.6442489017361288, 0.43694700610907494),
   vec2(0.510603973244744, -0.801374580339543),
   vec2(0.17385008749225664, 0.5247156266614584),
   vec2(-0.34345219794477133, -0.0761549859741795),
   vec2(0.5128283586085263, -0.5202313410768193),
   vec2(-0.6696504349930996, 0.7143770115176779)
);

// procedural rain noise
float rainHeightNoise(in vec2 uv) {
    float time = frx_renderSeconds * 8.0;
    uv += floor(time) * 0.2;
    time = mix(fract(time), 0.0, smoothstep(0.8, 0.9, fract(time))) * 0.2;

    //uv += frx_renderSeconds;

    float noise = 1.0 - cellular2x2(uv * 6.0).x;
    float n = noise;

    noise = smoothstep(0.8 - time, 0.84, noise);
    noise += smoothstep(0.6 - time, 0.8 - time, n) * 0.1; 

    return noise * 0.01;
}


void frx_pipelineFragment() {
    bool isInventory = frx_isGui && !frx_isHand;
    vec3 gamma = vec3(isInventory ? 1.0 : 2.2);

    #ifdef WHITE_WORLD
        frx_fragColor.rgb = vec3(1.0);
    #endif

    mat3 tbn = mat3(
        frx_vertexTangent.xyz, 
        cross(frx_vertexTangent.xyz, frx_vertexNormal.xyz), 
        frx_vertexNormal.xyz
    );

    #ifdef PBR_ENABLED
        // vec2 uv = frx_faceUv(frx_vertex.xyz + frx_cameraPos, frx_vertexNormal.xyz);

        // vec2 off = vec2(1e-2, 0.0);

        // float height1 = rainHeightNoise(uv + off.xy);
        // float height2 = rainHeightNoise(uv - off.xy);
        // float height3 = rainHeightNoise(uv + off.yx);
        // float height4 = rainHeightNoise(uv - off.yx);

        // float deltaX = height2 - height1 * 50.0;
        // float deltaY = height4 - height3 * 50.0;

        // vec3 newNormal = vec3(deltaX, deltaY, 1.0 - (deltaX * deltaX + deltaY * deltaY));

        // frx_fragNormal = newNormal;

        frx_fragNormal = tbn * frx_fragNormal;
        if(frx_isHand) {
            frx_fragNormal = frx_fragNormal * frx_normalModelMatrix;
        }
    #else
        #define frx_fragNormal frx_vertexNormal
    #endif

    // Fake roughness lol
    if(frx_fragRoughness == 1.0) frx_fragRoughness = 0.0;
    frx_fragNormal += rand3D(10.0 * gl_FragCoord.xy + 2.0 * mod(frx_renderSeconds, 1000.0)) * (frx_fragRoughness / 10.0);
    frx_fragNormal = normalize(frx_fragNormal);

    frx_fragColor.rgb = pow(frx_fragColor.rgb, gamma);
    vec4 color = frx_fragColor;

    int cascade = selectShadowCascade(shadowViewPos);
    vec4 shadowClipPos = frx_shadowProjectionMatrix(cascade) * shadowViewPos;
    vec3 shadowScreenPos = (shadowClipPos.xyz / shadowClipPos.w) * 0.5 + 0.5;

    float shadowMap;
    vec3 shadowBlurColor;
    //shadowMap += texture(frxs_shadowMap, vec4((shadowScreenPos.xy), cascade, shadowScreenPos.z));
    //if(frx_matCutout == 1) fmn_sssAmount = 1.0;

    // for(int i = -3; i < 3; i++) {
    //     for(int j = -3; j < 3; j++) {
    //         shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + vec2(i, j) / SHADOW_MAP_SIZE, cascade, shadowScreenPos.z)) / 16.0;
    //     }
    // }

    for(int i = 0; i < 36; i++) {
        shadowMap += texture(frxs_shadowMap, vec4(shadowScreenPos.xy + vogel_disk_36_progressive[i] / 800.0, cascade, shadowScreenPos.z)) / 20.0;
    }
    shadowMap = smoothstep(0.0, 0.9, shadowMap);
    shadowMap = clamp01(shadowMap);
    shadowMap *= mix(smoothstep(-0.0, 0.1, dot(frx_vertexNormal, frx_skyLightVector)), 1.0, fmn_sssAmount); // skip NdotL shading to approximate SSS

    // if(cascade == 3) {
    //     for(int i = 0; i < 100; i++) {
    //         vec3 flux = texture(u_shadow_color, vec3(shadowScreenPos.xy + vogel_disk_100_progressive[i] / 5.0, 0)).rgb;
    //         //flux *= max(0.0, dot(-frx_fragNormal, frx_skyLightVector));
    //         //flux /= pow(abs(shadowScreenPos.z - texture(frxs_shadowMapTexture, vec3(shadowScreenPos.xy, cascade))).r, 4.0);

    //         shadowBlurColor += flux / 100.0;    
    //     }
    // }


    // shadowBlurColor += 1.0 * shadowBlurColor * frx_luminance(shadowBlurColor);
    // shadowBlurColor = pow(shadowBlurColor, vec3(2.2));
    // vec3 flux;
    // vec4 shadowViewRSM = shadowViewPos;

    // vec3 direction = reflect(frx_fragNormal, -frx_skyLightVector);
    // // for(int i = -4; i < 4; i++) {
    // //     for(int j = -4; j < 4; j++) {
    // //         //vec2 offset = vec2(i, j)
    // //         shadowViewRSM.xyz += direction / 64.0;

    // //         int cascadeRSM = selectShadowCascade(shadowViewRSM);
    // //         vec4 shadowClipPosRSM = frx_shadowProjectionMatrix(cascadeRSM) * shadowViewRSM;
    // //         vec3 shadowScreenPosRSM = (shadowClipPosRSM.xyz / shadowClipPosRSM.w) * 0.5 + 0.5;
    // //         flux += distance(shadowViewRSM.xyz, shadowViewPos.xyz) * pow(texture(u_shadow_color, vec3(shadowScreenPosRSM.xy + 15.0 * vec2(i, j) / SHADOW_MAP_SIZE, 0)).rgb * 1.5, vec3(2.2)) / 64.0;
    // //     }
    // // }
    // shadowBlurColor = flux * max(0.0, dot(frx_fragNormal, frx_skyLightVector) * 0.5 + 0.5);
    // shadowBlurColor *= 1.0 - shadowMap;

    shadowMap = mix(0.0, shadowMap, frx_fragLight.y);

    if(frx_isHand) shadowMap = 0.5;
    float shadowMapInverse;

    if(!isInventory) {
        vec3 lightmap = vec3(1.0);

        #ifndef VANILLA_AO
            frx_fragLight.z = 1.0;
        #endif

        if(frx_worldIsEnd + frx_worldIsNether + frx_worldIsOverworld >= 1) {
            frx_fragLight.xy *= mix((1.0), (frx_darknessEffectFactor * 0.95 + 0.05), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0)));
            frx_fragLight.z = mix(frx_fragLight.z, 1.0, shadowMap);

            vec3 tdata = getTimeOfDayFactors();
            frx_fragLight.y = mix(frx_fragLight.y, 1.0, frx_worldIsEnd);

            shadowMap = mix(shadowMap, 0.0, tdata.z);
            shadowMapInverse = 1.0 - shadowMap;

            float NdotL = dot(frx_fragNormal, frx_skyLightVector) * 0.2 + 0.8;
            NdotL = mix(NdotL, 1.0, frx_matDisableDiffuse);

            frx_fragLight.z = mix(frx_fragLight.z, 1.0, frx_matDisableAo);
            frx_fragLight.x = pow(frx_fragLight.x, 1.0);


            vec3 blockLightColor = mix(normalize(vec3(3.6, 1.9, 0.8)) * 2.0, pow(vec3(1.0, 0.9, 0.8), vec3(2.2)) * 1.25, BLOCKLIGHT_NEUTRALITY);

            float blocklight = smoothstep(0.0, 1.0, frx_fragLight.x);
            blocklight = pow(blocklight * 2.0, 2.0);
            //blocklight = 1.0 / pow(16.0 - 15.0 * blocklight, 2.0);
            //blocklight *= smoothstep(0.005, 1e-2, blocklight);

            lightmap = vec3(0.0);

            vec3 undergroundLighting;
            undergroundLighting = max(vec3(0.0025), undergroundLighting);
            // undergroundLighting += vec3(1.2, 0.9, 0.5) * blocklight;
            undergroundLighting += blockLightColor * blockLightColor * blocklight;

            // float blockLightIntensity = 10.0 / pow((1.0 - (frx_fragLight.x)) * 16.0, 2.0);
            // undergroundLighting += blockLightColor * blockLightIntensity * 1.0;

            lightmap = mix(undergroundLighting, lightmap, frx_fragLight.y);

            vec3 aboveGroundLighting;

            vec3 skyLightColor = getSkyColor(frx_skyLightVector);
            vec3 ambientLightColor = getFogScattering(vec3(0.0, 1.0, 0.0), 100000.0);
            if(frx_worldIsEnd == 1) {
                float NdotPlanet = dot(frx_fragNormal, normalize(vec3(0.8, 0.3, -0.5)));
                ambientLightColor = mix(ambientLightColor, vec3(0.0, 0.3, 0.15), smoothstep(0.5, 1.0, NdotPlanet));
                ambientLightColor = mix(ambientLightColor, vec3(0.5, 0.05, 0.35), smoothstep(0.5, 1.0, 1.0 - NdotPlanet));
            }

            float skyIlluminance = frx_luminance(ambientLightColor) * mix(1.0, 1.5, clamp01(frx_skyLightVector.y));
            #ifdef AMBIENT_LIGHT_BOOST
                skyIlluminance *= 1.33;
            #endif
            //skyIlluminance = max(skyIlluminance, 0.005);
            skyIlluminance *= mix(1.0, 1.0, sqrt(clamp01(getMoonVector().y)));

            #ifdef AMBIENT_LIGHT_BOOST
                ambientLightColor = normalize(ambientLightColor) * 0.75 + 0.25;
            #else
                ambientLightColor = normalize(ambientLightColor);
            #endif

            //ambientLightColor = mix(ambientLightColor, max(ambientLightColor, shadowBlurColor * 4.0), smoothstep(1.0, -0.5, clamp01(dot(frx_fragNormal, frx_skyLightVector))));

            skyLightColor = normalize(skyLightColor) * 6.5;

            #ifdef AMBIENT_LIGHT_BOOST
                aboveGroundLighting += max(0.075, skyIlluminance) * ambientLightColor * shadowMapInverse;
            #else
                aboveGroundLighting += skyIlluminance * ambientLightColor * shadowMapInverse;
            #endif
            aboveGroundLighting += min(vec3(3.0), skyIlluminance * skyLightColor * shadowMap * (NdotL * NdotL));

            aboveGroundLighting = mix(aboveGroundLighting, max(blockLightColor, aboveGroundLighting), pow(frx_fragLight.x, 2.0));

            //if(cascade == 3) aboveGroundLighting += frx_skyLightVector.y * (2.0 + NdotL) * shadowBlurColor * shadowMapInverse;

            lightmap = mix(lightmap, aboveGroundLighting, frx_fragLight.y);


            if(frx_worldIsNether == 1) {
                lightmap = vec3(0.0);
                lightmap += vec3(0.1, 0.05, 0.0);

                lightmap += vec3(1.0, 0.25, 0.0) * (smoothstep(-0.5, 0.5, -frx_fragNormal.y) + 2.0 * pow(frx_fragLight.x, 2.0) + 0.3);
            }

            // handheld light
            float heldLightFactor = frx_smootherstep(frx_heldLight.a * 13.0, 0.0, distance(frx_eyePos, frx_vertex.xyz + frx_cameraPos));
            heldLightFactor *= clamp01(dot(-frx_fragNormal, normalize((frx_vertex.xyz + frx_cameraPos - frx_eyePos) - vec3(0.0, 1.5, 0.0)))); // direct surfaces lit more - idea from Lumi Lights by spiralhalo
            if(frx_isHand && !all(equal(frx_heldLight.rgb, vec3(1.0)))) heldLightFactor = 1.0; // hand is lit if holding emitter
            heldLightFactor = clamp01(heldLightFactor);
            lightmap = mix(lightmap, (max(pow(frx_heldLight.rgb * 1.2, vec3(2.2)), lightmap)), heldLightFactor);

            //lightmap = pow(lightmap, vec3(1.0 / (0.5 + frx_viewBrightness)));

            lightmap = mix(lightmap, lightmap * 0.75 + 0.25, frx_worldIsEnd);

            if(frx_effectNightVision == 1) lightmap = mix(lightmap, lightmap * 0.5 + 0.5, frx_effectModifier);

            lightmap = max(vec3(0.0005), lightmap);

            color.rgb *= pow(lightmap, vec3(1.0)) * pow(frx_fragLight.z, 1.5);
        } else {
            lightmap = pow(texture(frxs_lightmap, frx_fragLight.xy).rgb, vec3(2.2)) * pow(frx_fragLight.z, 1.5);

            color.rgb *= lightmap;
        }

        // Material info stuff
        color.rgb = mix(color.rgb, frx_fragColor.rgb, frx_fragEmissive * mix((1.0), (frx_darknessEffectFactor), frx_effectDarkness * clamp01(-(frx_luminance(frx_vanillaClearColor) - 1.0))));
        color.rgb += color.rgb * mix(20.0, 8.0, float(frx_isHand)) * frx_fragEmissive;

        color.rgb = mix(color.rgb, vec3(frx_luminance(lightmap), 0.0, 0.0), 0.5 * frx_matHurt); 
        color.rgb = mix(color.rgb, vec3(2.0), 0.5 * frx_matFlash); 
    } else {
        vec3 direction = vec3(0.2, 0.8, 0.6);
        float lengthSquared = dot(direction, direction);
        direction /= lengthSquared * inversesqrt(lengthSquared);
        color.rgb *= dot(frx_vertexNormal, direction) * 0.35 + 0.65;
    }

    if(frx_matGlint == 1) {
        vec3 glint = texture(u_glint, frx_normalizeMappedUV(frx_texcoord * 0.2 + frx_renderSeconds / 500.0)).rgb;
        glint = pow(glint, vec3(4.0));
        color.rgb += glint;
        frx_fragEmissive += frx_luminance(glint) * 0.5;
    }

    if(color.a < 0.05 && frx_renderTargetSolid && !frx_isGui) discard;
    if(frx_fragReflectance == 0.04) frx_fragReflectance = 0.0;

    //color.rgb = shadowBlurColor;

    fragColor = color;
    fragNormal = vec4(frx_fragNormal * 0.5 + 0.5, 1.0);
    vertexNormal = vec4(frx_vertexNormal * 0.5 + 0.5, 1.0);
    pbrData = vec4(frx_fragReflectance, fmn_isWater, 1.0, 1.0);

    gl_FragDepth = gl_FragCoord.z;
}