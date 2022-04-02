#include forgetmenot:shaders/lib/includes.glsl 

#ifdef VANILLA_LIGHTING
    //out vec3 directionalLight;
#endif

void frx_pipelineVertex() {
    if (frx_modelOriginScreen) {
        gl_Position = frx_guiViewProjectionMatrix * frx_vertex;
        frx_distance = length(gl_Position.xyz);
    } else {
        frx_vertex += frx_modelToCamera;
        gl_Position = frx_viewProjectionMatrix * frx_vertex;
        frx_distance = length(frx_vertex.xyz);
    }

    
    // -------
    // Diffuse shading
    // -------
    #ifdef VANILLA_LIGHTING
        // directionalLight = vec3(1.0);

        // vec3 sunVector = getSunVector();
        // vec3 moonVector = getMoonVector();

        // vec3 sunsetDiffuseColor = vec3(0.8, 0.9, 1.1) * (dot(frx_vertexNormal, moonVector) * 0.5 + 0.5) + vec3(1.1, 0.9, 0.8) * (dot(frx_vertexNormal, sunVector) * 0.5 + 0.5);
        // vec3 dayDiffuseColor = vec3(1.1, 1.0, 0.9) * dot(frx_vertexNormal, sunVector) * 0.35 + 0.65;
        // vec3 nightDiffuseColor = vec3(0.8, 1.0, 1.1) * dot(frx_vertexNormal, moonVector) * 0.35 + 0.65;

        // // float temp = mix(dot(frx_vertexNormal.xyz, frx_skyLightVector), abs(dot(frx_vertexNormal, frx_skyLightVector)), getTimeOfDayFactors().z);
        // // temp = mix(temp, dot(frx_vertexNormal.xyz, moonVector), getTimeOfDayFactors().y);

        // //directionalLight = vec3(temp * 0.35 + 0.65);
        
        // directionalLight = mix(directionalLight, sunsetDiffuseColor, getTimeOfDayFactors().z);
        // directionalLight = mix(directionalLight, dayDiffuseColor, getTimeOfDayFactors().x);
        // directionalLight = mix(directionalLight, nightDiffuseColor, getTimeOfDayFactors().y);

        // directionalLight = mix(directionalLight, vec3(dot(frx_vertexNormal, vec3(0.2, 0.3, 0.4)) * 0.25 + 0.75), 1.0 - frx_vertexLight.y);
    #endif
}