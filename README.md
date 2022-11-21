# Forget-Me-Not Shaders

Immersive semi-realistic pipeline shader for Canvas. Early in development. ONLY works with Canvas Renderer mod, incompatible with Optifine, Iris, and Sodium! See `how to use` section for installation instructions. 

Forget-me-not is licensed under the LGPL v3.0, so please make sure to read over the terms of the LGPL if you use any of Forget-me-not's original code.

**For now, Forget-me-not only reliably works with Nvidia and AMD Mesa graphics.**

Icon by [jahan](https://www.instagram.com/jahan.artt/), go check out their other amazing works!

## how to use third-party shaders with canvas
1. Be sure you're on 1.18.2 or above. Support is not guaranteed for versions that Canvas doesn't actively support.
2. Install [Fabric](https://fabricmc.net/) and get some cool mods that you like
3. Get Canvas Renderer mod through [Modrinth](https://modrinth.com/mod/canvas). **Keep in mind that Canvas does not work with Sodium, Iris, OptiFine, or OptiFabric.**
4. Download your preferred pipeline shaderpack
5. Launch your game, put your pipeline resource pack into your resource packs folder and enable the resource pack.
6. Activate your pipeline in `Options / Video Settings / Canvas / Pipeline Options / Pipelines`

## troubleshooting
- Experiencing shadow flickering? In `Options / Video Settings / Canvas / Debug`, set `Shadow Priming Strategy` to `TIERED` and `Disable Shadow Self-Occlusion` to true. You can also enable the `Skylight Leak Fix` option in Forget-me-not settings.
- Does Canvas say in chat that shaders are broken? Please grab your log in `.minecraft/logs/latest.log` and all contents of the `.minecraft/canvas_shader_debug/` folder and either make an issue on GitHub or let me know about it on Discord.
- Does every Canvas pipeline break other than Canvas Basic? If so, your device is probably incompatible with Fabulous graphics, which most Canvas pipelines use. Unfortunately, there's no fix for this.

## cool features
- seasons! be immersed in your world as the seasons change over time
- HDR, bloom, and tone mapping
- dramatic skies with atmospheric scattering, custom clouds, and crepuscular rays
- water waves and reflections, as well as PBR support
- contact-hardening variable penumbra shadows 
- advanced ambient shading (RTAO)
- advanced anti-aliasing (TAA)

## credits
- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help, and also references for a working TAA implementation
- [lomo](https://github.com/fewizz/lomo/releases) by fewizz for inspiration for many different things

## discord
https://discord.gg/Zzn4jJapRH