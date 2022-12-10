<div align="center">
<h1>Forget-Me-Not Shaders</h1>
<h4>developed by Ambrosia</h4>
</div align="center">

Forget-me-not is a semi-realistic pipeline shader for the [Canvas](https://modrinth.com/mod/canvas) mod. It's designed to give the most authentic and immersive experience while sticking to "traditional" rendering methods to keep up good performance.

Canvas is a client-side renderer mod that uses shaders for advanced rendering. The shader system is designed entirely differently from Optifine and Iris and as such, Forget-me-not won't work with any mod other than Canvas! See the `how to use` section for installation instructions. 

## disclaimers

**For now, Forget-me-not only reliably works with Nvidia and AMD Mesa graphics.**

Additionally, if you're a developer, Forget-me-not is licensed under the [LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html), so please make sure to read over the terms of the LGPL if you use any of Forget-me-not's original code.

## how to use third-party shaders with canvas

1. Be sure you're on 1.19.2 or above. Support is not guaranteed for versions that Canvas doesn't actively support.

2. Install [Fabric](https://fabricmc.net/wiki/install).

3. Install [Canvas](https://modrinth.com/mod/canvas) and drag it into the `mods` folder of your Fabric installation. **Keep in mind that Canvas will never work with Sodium, Iris, OptiFine, or OptiFabric.**

4. Get some other mods that you want to play with, so long as they are not part of the group of mods mentioned above.

5. Download your preferred pipeline shaderpack. If you're looking for alternatives to Forget-me-not, try out [Lumi Lights](https://github.com/spiralhalo/LumiLights/releases). You can also try out [Lomo](https://github.com/fewizz/lomo/releases), but as of now, it isn't meant for gameplay purposes. 

6. Launch your game, put your pipeline resource pack into your `resourcepacks` folder and activate the resource pack.

7. Navigate to `Options / Video Settings / Canvas / Pipeline Options / Pipelines` and select the pipeline that you want to play with.

## troubleshooting

- Experiencing bad shadow outcomes? In `Options / Video Settings / Canvas / Debug`, set `Shadow Priming Strategy` to `TIERED` and `Disable Shadow Self-Occlusion` to true. You can also enable the `Skylight Leak Fix` option in Forget-me-not settings.

- Does Canvas say in chat that shaders are broken? Please grab your log in `.minecraft/logs/latest.log` and all contents of the `.minecraft/canvas_shader_debug/` folder and either make an issue on GitHub or let me know about it on Discord.

- Does every Canvas pipeline break other than Canvas Basic? If so, your device is probably incompatible with Fabulous graphics, which most Canvas pipelines use. Unfortunately, there's no fix for this.

## feature highlights

- seasons! be immersed in your world as the seasons change over time

- HDR, bloom, and tone mapping

- dramatic skies with atmospheric scattering, custom clouds, and crepuscular rays

- water waves and reflections

- support for most of the FREX PBR API

- contact-hardening variable penumbra shadows 

- advanced ambient shading (RTAO)

- advanced anti-aliasing (TAA)

## credits

- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help, and also references for a working TAA implementation
- [lomo](https://github.com/fewizz/lomo/releases) by fewizz for inspiration for many different things

## discord

https://discord.gg/Zzn4jJapRH