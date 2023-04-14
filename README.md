# Forget-me-not Shaders

**Forget-me-not** is a semi-realistic pipeline shader for the [Canvas](https://modrinth.com/mod/canvas) mod. It's designed to give the most authentic and immersive experience while sticking to "traditional" rendering methods to keep up good performance.

**Canvas** is a client-side renderer mod that uses shaders for advanced rendering with the goal of having a modern and very flexible design for high performance and better readability. The shader system is entirely different from Optifine and Iris & Sodium and as such, Forget-me-not won't work with any of these mods! See the `how to use` section for installation instructions. 

## notice

If you're a developer or mod hoster, Forget-me-not is licensed under the [LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html), so please make sure to read over the terms of the LGPL if you use any of Forget-me-not's original code or distribute it.

## how to use third-party shaders with canvas

1. Be sure you're on 1.19.2. Support is not guaranteed for versions that Canvas doesn't actively support.

2. Install [Fabric](https://fabricmc.net/wiki/install).

3. Get Canvas Renderer mod through [Modrinth](https://modrinth.com/mod/canvas). You can also find an unofficial 1.19.3 build [here](https://cdn.discordapp.com/attachments/614626265663668276/1079640291906170921/canvas-fabric-mc119-1.0.2515-SNAPSHOT.jar). **Keep in mind that Canvas does not work with Sodium, Iris, OptiFine, or OptiFabric.**

4. Download your preferred pipeline shaderpack. If you're looking for alternatives to Forget-me-not, try out [Lumi Lights](https://github.com/spiralhalo/LumiLights/releases), [Lomo (not for gameplay)](https://github.com/fewizz/lomo/releases), or [Aerie (vanilla-plus)](https://modrinth.com/shader/aerie-shaders).

5. Launch your game, put your downloaded `.zip` file into your `resourcepacks` folder and activate the resource pack. (Don't extract it!)

6. Navigate to `Options / Video Settings / Canvas / Pipeline Options / Pipelines` and select the pipeline that you want to play with.

## troubleshooting

- Experiencing bad shadow outcomes? In `Options / Video Settings / Canvas / Debug`, set `Shadow Priming Strategy` to `TIERED` and `Disable Shadow Self-Occlusion` to true.

- Does Canvas say in chat that some shaders are broken? Please grab your log in `.minecraft/logs/latest.log` and all contents of the `.minecraft/canvas_shader_debug/` folder and either make an issue on GitHub or let me know about it on Discord.

- Does every Canvas pipeline break other than Canvas Basic? If so, your device is probably incompatible with Fabulous graphics, which most Canvas pipelines use. Unfortunately, there's no fix for this.

## feature highlights

- seasons! be immersed in your world as the seasons change over time

- HDR, bloom, and tone mapping

- dramatic skies with atmospheric scattering and custom realistic clouds

- water waves and reflections

- support for PBR, with hundreds of built-in default materials

- contact-hardening variable penumbra shadows 

- advanced ambient shading (RTAO)

- advanced anti-aliasing (TAA)

## credits

Forget-me-not wouldn't be nearly as polished as it is if it weren't for the help of people like fewizz, spiralhalo, Grondag, and many others from the Canvas community for contributing and testing. Here are some specifics:

- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [Lumi Lights](https://github.com/spiralhalo/LumiLights) by spiralhalo for lots of different inspiration & help, and also references for a working TAA implementation
- [lomo](https://github.com/fewizz/lomo/releases) by fewizz for inspiration for many different things, as well as the raytracer and lots of testing

## discord

https://discord.gg/Zzn4jJapRH