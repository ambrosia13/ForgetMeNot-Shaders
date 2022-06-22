# todo:
- fix VL on non-depressing mode (filter, etc)
- fix global illumination
- add "alternate" GI raytracer that is just raytraced ambient occlusion with extra steps (uh, not actual mathematical steps. RTAO with increased intervals)
- move changed sky stuff to sky reflection calculation too
- physically based atmosphere for sky and clouds shading, adjust terrain lighting
- add in specular highlight
- dFdx/y works fine on AMD, not on NVidia...?
- Am going to be exclusively working on shadow pipeline now, transfer all changes to no-shadow
- Add back shadows without MC lightmap