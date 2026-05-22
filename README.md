# Forget-me-not Shaders

**Forget-me-not** is a semi-realistic pipeline shader for the [Can-Pipe](https://modrinth.com/mod/can-pipe) mod, with the goal of using a wide variety of visual effects for a truly diverse Minecraft experience.

**Can-Pipe** is a continuation of Canvas, a client-side renderer mod that uses shaders for advanced rendering. The shader system is entirely different from Optifine and Iris & Sodium and thus will not work with Can-Pipe or Forget-me-not.

See the `how to use` section for installation instructions. 

## notice

If you're a developer or mod hoster, Forget-me-not is licensed under the [LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html), so please make sure to read over the terms of the LGPL if you use any of Forget-me-not's original code or distribute it.

## how to use third-party shaders with canvas

1. Be sure you're on 26.1.1 or above. Support is not guaranteed for versions that Can-Pipe doesn't actively support. You can check the supported versions of Can-Pipe [here](https://modrinth.com/mod/can-pipe/versions).

2. Install [Fabric](https://fabricmc.net/wiki/install).

3. Get Can-Pipe through [Modrinth](https://modrinth.com/mod/can-pipe). **Can-Pipe should not be installed alongside Sodium, Iris, OptiFine, or OptiFabric.**

4. Download your preferred pipeline shaderpack. If you're looking for an alternative to Forget-me-not, try out [Lumi Lights](https://github.com/spiralhalo/LumiLights/releases) by spiralhalo.

5. Launch your game, put your downloaded `.zip` file into your `resourcepacks` folder and activate the resource pack. (There's no need to extract it!)

6. Navigate to `Options/Video Settings/Quality & Performance/Pipeline` and select the pipeline that you want to use.

## feature highlights

- seasons! be immersed in your world with the first shaders-only implementation of dynamic seasons 

- internal HDR, tone mapping, bloom, exposure, and other camera emulations

- dramatic skies with a realistic atmosphere and clouds

- water waves and reflections

- hundreds of built-in default PBR materials

- contact-hardening variable penumbra shadows 

- advanced anti-aliasing (TAA)

## credits

Forget-me-not wouldn't gotten as far as it did without the support of various people across the Canvas and shaderLABS communities. Special thanks to:

- [fewizz](https://github.com/fewizz), for bringing Canvas into modern versions as the developer of Can-Pipe! Additionally, they made many invaluable contributions to Forget-me-not itself, including the high quality raytracer and countless bug fixes and reports
- [spiralhalo](https://github.com/spiralhalo) for lots of help in my Canvas journey, as well as their shaderpack, [Lumi Lights](https://github.com/spiralhalo/LumiLights) for inspiration and references for a working TAA implementation
- [Grondag](https://github.com/grondag) and spiralhalo for the years of development they put into the original Canvas mod, and hearing out my many feature requests along the way
- [supsm](https://github.com/supsm) for their many hours of active testing, as well as their work towards their Forget-me-not fork, [Brunnera](https://github.com/supsm/Brunnera-Shaders)! 
- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [@jahan.artt](https://www.instagram.com/jahan.artt/?hl=en) for both of Forget-me-not's icons!

## discord

https://discord.gg/Zzn4jJapRH