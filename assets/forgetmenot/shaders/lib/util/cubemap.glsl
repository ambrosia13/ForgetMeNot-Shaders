#ifdef INCLUDE_CUBEMAPS
     void getCubemapViewDirs(in vec2 uv, out vec3 viewDirs[6]) {
          vec3 a = normalize(vec3(uv - 0.5, 0.5));
          
          viewDirs[0] = vec3( a.z, -a.y, -a.x);
          viewDirs[1] = vec3(-a.z, -a.y,  a.x);
          viewDirs[2] = vec3( a.x,  a.z,  a.y);
          viewDirs[3] = vec3( a.x, -a.z, -a.y);
          viewDirs[4] = vec3( a.x, -a.y,  a.z);
          viewDirs[5] = vec3(-a.x, -a.y, -a.z);
     }

     vec4 sampleAllCubemapFaces(in samplerCube cubemap) {
          const vec3[] FORWARD_VECS = vec3[] (
               vec3(1, 0, 0),
               vec3(-1, 0, 0),
               vec3(0, 1, 0),
               vec3(0, -1, 0),
               vec3(0, 0, 1),
               vec3(0, 0, -1)
          );

          vec4 color = vec4(0.0);
          color += textureLod(cubemap, FORWARD_VECS[0], 9) * 0.1;
          color += textureLod(cubemap, FORWARD_VECS[1], 9) * 0.1;
          color += textureLod(cubemap, FORWARD_VECS[2], 9) * 0.5;
          color += textureLod(cubemap, FORWARD_VECS[3], 9) * 0.1;
          color += textureLod(cubemap, FORWARD_VECS[4], 9) * 0.1;
          color += textureLod(cubemap, FORWARD_VECS[5], 9) * 0.1;

          return color;
     }
#endif