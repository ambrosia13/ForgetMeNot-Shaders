# Forget-me-not Shaders

**Forget-me-not** is a semi-realistic pipeline shader for the [Can-Pipe](https://modrinth.com/mod/can-pipe) mod, with the goal of using a wide variety of visual effects for a diverse Minecraft experience.

**Can-Pipe** is a continuation of Canvas, a client-side renderer mod that uses shaders for advanced rendering. Its rendering system is entirely different from Optifine, Aperture, Iris, and Sodium; thus, it will not work with any of these mods.
**Can-Pipe** is a continuation of Canvas, a client-side renderer mod that uses shaders for advanced rendering. Its rendering system is entirely different from Optifine, Aperture, Iris, and Sodium; thus, it will not work with any of these mods.

See the `how to use` section for installation instructions. 

## notice

If you're a developer or mod hoster, Forget-me-not is licensed under the [LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html), so please make sure to read over its terms if you use any of Forget-me-not's original code or distribute it.

Additionally, the only places Forget-me-not is officially released to are the [GitHub](https://github.com/ambrosia13/ForgetMeNot-Shaders) and [Modrinth](https://modrinth.com/shader/forgetmenot) pages. If you're finding Forget-me-not on a mod rehosting site like 9minecraft, it's much safer to just download it from the official (ad-free!) pages instead.
If you're a developer or mod hoster, Forget-me-not is licensed under the [LGPL v3.0](https://www.gnu.org/licenses/lgpl-3.0.en.html), so please make sure to read over its terms if you use any of Forget-me-not's original code or distribute it.

Additionally, the only places Forget-me-not is officially released to are the [GitHub](https://github.com/ambrosia13/ForgetMeNot-Shaders) and [Modrinth](https://modrinth.com/shader/forgetmenot) pages. If you're finding Forget-me-not on a mod rehosting site like 9minecraft, it's much safer to just download it from the official (ad-free!) pages instead.

## how to use third-party shaders with canvas

1. Be sure you're on a Minecraft version with a recent release of Can-Pipe available (`21.1.X` as of this writing). Support is not guaranteed for versions that Can-Pipe doesn't actively support. You can check the supported Minecraft versions of the mod [here](https://modrinth.com/mod/can-pipe/versions).

2. Install [Fabric](https://fabricmc.net/wiki/install) or [NeoForge](https://neoforged.net/).

3. Get Can-Pipe through [Modrinth](https://modrinth.com/mod/can-pipe). **Can-Pipe should not be installed alongside Sodium, Iris, Aperture, OptiFine, or OptiFabric.**

4. Download your preferred pipeline shaderpack. If you're looking for an alternative to Forget-me-not, try out [Lumi Lights Plus](https://modrinth.com/resourcepack/lumi-lights-plus) by spiralhalo. 

5. Launch your game, put your downloaded `.zip` file into your `resourcepacks` folder and activate the resource pack. (There's no need to extract it!)

6. Navigate to `Options/Video Settings/Quality & Performance/Pipeline` and keep clicking until the pipeline you want to use is selected.

> Note: You can also get in-development versions of Forget-me-not on [GitHub](https://github.com/ambrosia13/ForgetMeNot-Shaders)! The easiest way is to `git clone` the repository into your resource pack folder directly, but you can also download the repository as a `.zip` file (in which case you'll have to extract it). 

## feature highlights

- seasons! be immersed in your world with the first shaders-only implementation of dynamic seasons 

- internal HDR, tone mapping, bloom, exposure, and other camera emulations

- dramatic skies with a realistic atmosphere and clouds

- water waves and reflections, including support for resource pack water textures

- hundreds of built-in default PBR materials

- contact-hardening variable penumbra shadows 

- advanced anti-aliasing (TAA)

## credits

Forget-me-not wouldn't have gotten as far as it did without the support of various people across the Canvas and shaderLABS communities. Special thanks to:
Forget-me-not wouldn't have gotten as far as it did without the support of various people across the Canvas and shaderLABS communities. Special thanks to:

- [fewizz](https://github.com/fewizz), for bringing Canvas into modern versions as the developer of Can-Pipe! Additionally, they made many invaluable contributions to Forget-me-not itself, including the high quality raytracer and countless bug fixes and reports
- [spiralhalo](https://github.com/spiralhalo) for lots of help in my Canvas journey, as well as their original pipeline shader, [Lumi Lights](https://github.com/spiralhalo/LumiLights), for inspiration and references for a working TAA implementation
- [Grondag](https://github.com/grondag) and spiralhalo for the years of development they put into the original Canvas mod, and hearing out my many feature requests along the way
- [supsm](https://github.com/supsm) for their many hours of active testing, as well as their work towards their Forget-me-not fork, [Brunnera](https://github.com/supsm/Brunnera-Shaders)! 
- The [shaderLABS discord channel #snippets](https://discord.com/channels/237199950235041794/525510804494221312/959153316401655849) for many useful code snippets
- [@jahan.artt](https://www.instagram.com/jahan.artt/?hl=en) for both of Forget-me-not's icons!

## discord

https://discord.gg/Zzn4jJapRH
