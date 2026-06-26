import Gl from '@/Gl';
import { PostStore } from '@/store/store';
import UseGUI from '@/utils/UseGUI';
import {
	EffectComposer,
	EffectPass,
	RenderPass,
	SelectiveBloomEffect,
	BlendFunction,
	VignetteTechnique,
	VignetteEffect,
	EdgeDetectionMode,
	PredicationMode,
	SMAAEffect,
	SMAAPreset,
	BloomEffect,
	ToneMappingEffect,
	ToneMappingMode,
	HueSaturationEffect,
	BrightnessContrastEffect,
	ColorAverageEffect,
	SepiaEffect,
	LUT3DEffect,
	LookupTexture3D,
	ShaderPass,
	Effect,
	EffectAttribute,
	OutlineEffect,
	KernelSize
} from 'postprocessing';
import {
	HalfFloatType,
	NoToneMapping,
	DataTexture,
	RGBAFormat,
	FloatType,
	LinearFilter,
	NearestFilter,
	ClampToEdgeWrapping,
	UnsignedByteType,
	TextureLoader,
	Texture,
	ShaderMaterial,
	Uniform,
	Color
} from 'three';
import { N8AOPostPass } from 'n8ao';

export default class PostManager {
	private gl: Gl;
	private composer: EffectComposer;

	public sBloomEffect: SelectiveBloomEffect;
	public bloomEffect: BloomEffect;
	public toneMappingEffect: ToneMappingEffect;
	public hueSaturationEffect: HueSaturationEffect;
	public brightnessContrastEffect: BrightnessContrastEffect;
	public colorAverageEffect: ColorAverageEffect;
	public sepiaEffect: SepiaEffect;
	postprocessingFolder: any;
	outlineSelection = [];
	private hologramEffect: Effect | null = null;

	constructor() {
		this.gl = Gl.getInstance();
		// We'll use our ToneMappingEffect instead of renderer's built-in tone mapping
		this.gl.renderer.toneMapping = NoToneMapping;
		this.composer = new EffectComposer(this.gl.renderer, {
			frameBufferType: HalfFloatType,
			stencilBuffer: true, // Enable stencil for N8AO compatibility
			depthBuffer: true,   // Enable depth buffer
			// multisampling: 8
		});
		const renderPass = new RenderPass(this.gl.scene, this.gl.camera);
		// Clear stencil buffer explicitly for N8AO stencil support
		renderPass.clearPass.setClearFlags(true, true, true);
		this.composer.addPass(renderPass);

		this.postprocessingFolder = UseGUI.getInstance().addFolder('Postprocessing').close();
	}

	render() {
		// Update hologram effect time uniform if it exists
		if (this.hologramEffect && this.hologramEffect.uniforms.has('time')) {
			this.hologramEffect.uniforms.get('time')!.value = performance.now() * 0.001;
		}

		this.composer.render();
	}

	public createN8AOPostPass() {
		const width = window.innerWidth; // Or this.gl.renderer.domElement.clientWidth
		const height = window.innerHeight; // Or this.gl.renderer.domElement.clientHeight

		const n8aoOptions = {
			aoRadius: 1.0,          // World-space radius for AO sampling
			intensity: 1.0,         // Multiplier for AO strength
			color: '#000000',       // Tint color for occluded areas
			quality: 1,             // 0=low, 1=medium, 2=high (integer)
			distanceFalloff: 1.0 / 50.0, // Distance-based falloff
			screenSpaceRadius: true, // Use screen-space for radius calculation
			noiseTexture: null,     // Optional: Generate for dithering (see below)
			bias: 0.5,              // Self-occlusion bias
			luminanceInfluence: 0.7, // Luminance-based AO modulation
			gammaCorrection: false  // Set to true if this is the last pass
		};

		const n8aoPass = new N8AOPostPass(this.gl.scene, this.gl.camera, width, height, n8aoOptions);
		

		this.composer.addPass(n8aoPass);

		// Recommended: Add SMAA for anti-aliasing after N8AO
		const smaaEffect = new SMAAEffect({ preset: SMAAPreset.ULTRA });
		const smaaPass = new EffectPass(this.gl.camera, smaaEffect);
		this.composer.addPass(smaaPass);

		// GUI Controls
		const n8aoFolder = this.postprocessingFolder.addFolder('N8AO');
		n8aoFolder.close();

		const params = {
			aoRadius: n8aoOptions.aoRadius,
			intensity: n8aoOptions.intensity,
			quality: n8aoOptions.quality,
			screenSpaceRadius: n8aoOptions.screenSpaceRadius,
			distanceFalloff: n8aoOptions.distanceFalloff,
			luminanceInfluence: n8aoOptions.luminanceInfluence,
			bias: n8aoOptions.bias,
			gammaCorrection: n8aoOptions.gammaCorrection
		};

		n8aoFolder.add(params, 'aoRadius', 0.0, 10.0, 0.1).onChange((value: number) => {
			n8aoPass.configuration.aoRadius = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'intensity', 0.0, 10.0, 0.01).onChange((value: number) => {
			n8aoPass.configuration.intensity = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'quality', [0, 1, 2]).onChange((value: number) => {
			n8aoPass.configuration.quality = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'screenSpaceRadius').onChange((value: boolean) => {
			n8aoPass.configuration.screenSpaceRadius = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'distanceFalloff', 0.0, 1.0, 0.001).onChange((value: number) => {
			n8aoPass.configuration.distanceFalloff = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'luminanceInfluence', 0.0, 1.0, 0.01).onChange((value: number) => {
			n8aoPass.configuration.luminanceInfluence = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'bias', 0.0, 1.0, 0.01).onChange((value: number) => {
			n8aoPass.configuration.bias = value;
			n8aoPass.needsUpdate = true;
		});

		n8aoFolder.add(params, 'gammaCorrection').onChange((value: boolean) => {
			n8aoPass.configuration.gammaCorrection = value;
			n8aoPass.needsUpdate = true;
		});
	}

	public depthRevealEffect() {
		const gl = this.gl;

		class DepthRevealEffect extends Effect {
			constructor() {
				super(
					'DepthRevealEffect',
					`
					uniform float nearPlane;
					uniform float farPlane;
					uniform float intensity;

					float toLinearDepth (float zDepth) {
						float near = nearPlane;
						float far = farPlane;
						return (2.0 * near * far / (far + near - (2.0 * zDepth - 1.0) * (far - near)));
					}
					
					void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
						// Convert depth to linear view space
						float viewZ = getViewZ(depth);
						
						// Normalize depth between near and far planes
						float normalizedDepth = (-viewZ - nearPlane) / (farPlane - nearPlane);
						normalizedDepth = clamp(normalizedDepth, 0.0, 1.0);
						
						// Create depth visualization (closer = darker, farther = lighter)
						// vec3 depthColor = vec3(1.-normalizedDepth);
						vec3 depthColor = vec3(pow(toLinearDepth(viewZ),0.5));
						
						// Mix with original color based on intensity
						outputColor = vec4(mix(inputColor.rgb, depthColor, intensity), inputColor.a);
					}
				`,
					{
						blendFunction: BlendFunction.NORMAL,
						attributes: EffectAttribute.DEPTH,
						uniforms: new Map([
							['nearPlane', new Uniform(gl.camera.near)],
							['farPlane', new Uniform(gl.camera.far)],
							['intensity', new Uniform(0.0)]
						])
					}
				);
			}
		}

		const depthRevealEffect = new DepthRevealEffect();
		const depthRevealPass = new EffectPass(this.gl.camera, depthRevealEffect);
		this.composer.addPass(depthRevealPass);

		// Add GUI controls
		const depthFolder = this.postprocessingFolder.addFolder('Depth Reveal');
		depthFolder.close();

		const params = {
			intensity: 1.0,
			nearPlane: this.gl.camera.near,
			farPlane: this.gl.camera.far
		};

		depthFolder.add(params, 'intensity', 0.0, 1.0, 0.01).onChange((value: number) => {
			depthRevealEffect.uniforms.get('intensity')!.value = value;
		});

		depthFolder.add(params, 'nearPlane', 0.1, 10.0, 0.1).onChange((value: number) => {
			depthRevealEffect.uniforms.get('nearPlane')!.value = value;
		});

		depthFolder.add(params, 'farPlane', 10.0, 1000.0, 1.0).onChange((value: number) => {
			depthRevealEffect.uniforms.get('farPlane')!.value = value;
		});
	}

	public createBloomEffect(options?: {
		blendFunction?: number;
		mipmapBlur?: boolean;
		luminanceThreshold?: number;
		luminanceSmoothing?: number;
		intensity?: number;
		radius?: number;
		luminanceEnabled?: boolean;
		opacity?: number;
	}) {
		// Set default values and override with provided options
		const bloomOptions = {
			blendFunction: options?.blendFunction ?? BlendFunction.ADD,
			mipmapBlur: options?.mipmapBlur ?? true,
			luminanceThreshold: options?.luminanceThreshold ?? 1,
			luminanceSmoothing: options?.luminanceSmoothing ?? 0.0,
			intensity: options?.intensity ?? 1.2,
			radius: options?.radius ?? 0.5
		};

		this.bloomEffect = new BloomEffect(bloomOptions);
		this.bloomEffect.luminancePass.enabled = options?.luminanceEnabled ?? true;

		// this.bloomEffect.inverted = true;
		this.bloomEffect.blendMode.setOpacity(options?.opacity ?? 1);

		const bloomPass = new EffectPass(this.gl.camera, this.bloomEffect);
		bloomPass.dithering = true;
		this.composer.addPass(bloomPass);

		const bloomFolder = this.postprocessingFolder.addFolder('Bloom');
		bloomFolder.close();

		const blendMode = this.bloomEffect.blendMode;

		const params = {
			intensity: this.bloomEffect.intensity,
			// @ts-ignore
			radius: this.bloomEffect.mipmapBlurPass.radius,
			luminance: {
				filter: this.bloomEffect.luminancePass.enabled,
				threshold: this.bloomEffect.luminanceMaterial.threshold,
				smoothing: this.bloomEffect.luminanceMaterial.smoothing
			},
			opacity: blendMode.opacity.value,
			'blend mode': blendMode.blendFunction
		};

		bloomFolder.add(params, 'intensity', 0.0, 10.0, 0.01).onChange((value: any) => {
			this.bloomEffect.intensity = Number(value);
		});

		bloomFolder.add(params, 'radius', 0.0, 1.0, 0.001).onChange((value: any) => {
			// @ts-ignore
			this.bloomEffect.mipmapBlurPass.radius = Number(value);
		});

		let folder = bloomFolder.addFolder('Luminance');

		folder.add(params.luminance, 'filter').onChange((value: boolean) => {
			this.bloomEffect.luminancePass.enabled = value;
		});

		folder.add(params.luminance, 'threshold', 0.0, 3.0, 0.01).onChange((value: any) => {
			this.bloomEffect.luminanceMaterial.threshold = Number(value);
		});

		folder.add(params.luminance, 'smoothing', 0.0, 1.0, 0.001).onChange((value: any) => {
			this.bloomEffect.luminanceMaterial.smoothing = Number(value);
		});

		folder.open();

		bloomFolder.add(params, 'opacity', 0.0, 1.0, 0.01).onChange((value: any) => {
			blendMode.opacity.value = value;
		});

		bloomFolder.add(params, 'blend mode', BlendFunction).onChange((value: any) => {
			blendMode.setBlendFunction(Number(value));
		});

		bloomFolder.add(bloomPass, 'dithering').onChange((value: any) => {
			bloomPass.dithering = value;
		});
	}

	public createSelectiveBloomEffect() {
		this.sBloomEffect = new SelectiveBloomEffect(this.gl.scene, this.gl.camera, {
			blendFunction: BlendFunction.ADD,
			mipmapBlur: true,
			luminanceThreshold: 0.0,
			luminanceSmoothing: 0.0,
			intensity: 1.2,
			radius: 0.6
		});
		this.sBloomEffect.luminancePass.enabled = false;
		PostStore.setState({ bloomEffect: this.sBloomEffect });

		// this.sBloomEffect.inverted = true;
		this.sBloomEffect.ignoreBackground = true;
		this.sBloomEffect.blendMode.setOpacity(1);

		const bloomPass = new EffectPass(this.gl.camera, this.sBloomEffect);
		this.composer.addPass(bloomPass);

		const bloomFolder = this.postprocessingFolder.addFolder('Bloom');
		bloomFolder.close();

		const blendMode = this.sBloomEffect.blendMode;

		const params = {
			intensity: this.sBloomEffect.intensity,
			// @ts-ignore
			radius: this.sBloomEffect.mipmapBlurPass.radius,
			luminance: {
				filter: this.sBloomEffect.luminancePass.enabled,
				threshold: this.sBloomEffect.luminanceMaterial.threshold,
				smoothing: this.sBloomEffect.luminanceMaterial.smoothing
			},
			selection: {
				inverted: this.sBloomEffect.inverted,
				'ignore bg': this.sBloomEffect.ignoreBackground
			},
			opacity: blendMode.opacity.value,
			'blend mode': blendMode.blendFunction
		};

		bloomFolder.add(params, 'intensity', 0.0, 10.0, 0.01).onChange((value: any) => {
			(this.sBloomEffect as SelectiveBloomEffect).intensity = Number(value);
		});

		bloomFolder.add(params, 'radius', 0.0, 1.0, 0.001).onChange((value: any) => {
			// @ts-ignore
			(this.sBloomEffect as SelectiveBloomEffect).mipmapBlurPass.radius = Number(value);
		});

		let folder = bloomFolder.addFolder('Luminance');

		folder.add(params.luminance, 'filter').onChange((value: boolean) => {
			(this.sBloomEffect as SelectiveBloomEffect).luminancePass.enabled = value;
		});

		folder.add(params.luminance, 'threshold', 0.0, 1.0, 0.001).onChange((value: any) => {
			(this.sBloomEffect as SelectiveBloomEffect).luminanceMaterial.threshold =
				Number(value);
		});

		folder.add(params.luminance, 'smoothing', 0.0, 1.0, 0.001).onChange((value: any) => {
			(this.sBloomEffect as SelectiveBloomEffect).luminanceMaterial.smoothing =
				Number(value);
		});

		folder.open();
		folder = bloomFolder.addFolder('Selection');

		folder.add(params.selection, 'inverted').onChange((value: any) => {
			(this.sBloomEffect as SelectiveBloomEffect).inverted = value;
		});

		folder.add(params.selection, 'ignore bg').onChange((value: any) => {
			(this.sBloomEffect as SelectiveBloomEffect).ignoreBackground = value;
		});

		folder.open();

		bloomFolder.add(params, 'opacity', 0.0, 1.0, 0.01).onChange((value: any) => {
			blendMode.opacity.value = value;
		});

		bloomFolder.add(params, 'blend mode', BlendFunction).onChange((value: any) => {
			blendMode.setBlendFunction(Number(value));
		});

		bloomFolder.add(bloomPass, 'dithering').onChange((value: any) => {
			bloomPass.dithering = value;
		});
	}

	createVignetteEffect() {
		const vignetteOptions = {
			offset: 0.1,
			darkness: 0.67,
			technique: VignetteTechnique.DEFAULT,
			blendFunction: BlendFunction.SET
		};
		const vignetteEffect = new VignetteEffect(vignetteOptions);
		const vignettePass = new EffectPass(this.gl.camera, vignetteEffect);
		this.composer.addPass(vignettePass);

		// ************* GUI *************
		const vignetteFolder = this.postprocessingFolder.addFolder('Vignette');
		{
			vignetteFolder.close();
			vignetteFolder
				.add(vignetteOptions, 'offset', 0.0, 1.0, 0.001)
				.onChange((value: any) => {
					vignetteEffect.offset = Number(value);
				});
			vignetteFolder
				.add(vignetteOptions, 'darkness', 0.0, 1.0, 0.001)
				.onChange((value: any) => {
					vignetteEffect.darkness = Number(value);
				});

			vignetteFolder
				.add(vignetteOptions, 'blendFunction', BlendFunction)
				.onChange((value: any) => {
					vignetteEffect.blendMode.blendFunction = Number(value);
				});
		}
	}

	public createSMAAEffect() {
		const smaaOptions = {
			preset: SMAAPreset.HIGH,
			edgeDetectionMode: EdgeDetectionMode.COLOR,
			predicationMode: PredicationMode.DISABLED
		};
		const smaaEffect = new SMAAEffect(smaaOptions);
		const smaaPass = new EffectPass(this.gl.camera, smaaEffect);

		const smaaFolder = this.postprocessingFolder.addFolder('SMAA');
		{
			smaaFolder.add(smaaOptions, 'preset', SMAAPreset).onChange((value: number) => {
				smaaEffect.applyPreset(Number(value));
			});
		}
		this.composer.addPass(smaaPass);
	}

	public createToneMappingEffect(options?: {
		mode?: ToneMappingMode;
		resolution?: number;
		whitePoint?: number;
		middleGrey?: number;
		minLuminance?: number;
		averageLuminance?: number;
		adaptationRate?: number;
		blendFunction?: BlendFunction;
	}) {
		const toneMappingOptions = {
			mode: options?.mode ?? ToneMappingMode.AGX,
			resolution: 256,
			whitePoint: 16.0,
			middleGrey: 0.6,
			minLuminance: 0.01,
			averageLuminance: 0.01,
			adaptationRate: 1.0,
			blendFunction: BlendFunction.NORMAL
		};

		this.toneMappingEffect = new ToneMappingEffect(toneMappingOptions);
		const toneMappingPass = new EffectPass(this.gl.camera, this.toneMappingEffect);
		this.composer.addPass(toneMappingPass);

		// ************* GUI *************
		const toneMappingFolder = this.postprocessingFolder.addFolder('Tone Mapping');
		toneMappingFolder.close();

		const renderer = this.gl.renderer;
		const blendMode = this.toneMappingEffect.blendMode;

		// Create parameters object for the GUI
		const params = {
			mode: toneMappingOptions.mode,
			exposure: renderer.toneMappingExposure,
			whitePoint: toneMappingOptions.whitePoint,
			middleGrey: toneMappingOptions.middleGrey,
			averageLuminance: toneMappingOptions.averageLuminance,
			resolution: toneMappingOptions.resolution,
			adaptationRate: toneMappingOptions.adaptationRate,
			minLuminance: toneMappingOptions.minLuminance,
			opacity: blendMode.opacity.value,
			blendFunction: blendMode.blendFunction
		};

		toneMappingFolder.add(params, 'mode', ToneMappingMode).onChange((value: any) => {
			// @ts-ignore - Direct assignment for mode
			this.toneMappingEffect.mode = Number(value);
		});

		toneMappingFolder.add(params, 'exposure', 0.0, 2.0, 0.001).onChange((value: any) => {
			renderer.toneMappingExposure = value;
		});

		// Reinhard (Modified) folder
		const reinhardFolder = toneMappingFolder.addFolder('Reinhard (Modified)');
		reinhardFolder.add(params, 'whitePoint', 2.0, 32.0, 0.01).onChange((value: any) => {
			// @ts-ignore - Direct assignment, might be read-only in TypeScript but works at runtime
			this.toneMappingEffect.whitePoint = Number(value);
		});

		reinhardFolder.add(params, 'middleGrey', 0.0, 1.0, 0.0001).onChange((value: any) => {
			// @ts-ignore - Direct assignment, might be read-only in TypeScript but works at runtime
			this.toneMappingEffect.middleGrey = Number(value);
		});

		reinhardFolder
			.add(params, 'averageLuminance', 0.0001, 1.0, 0.0001)
			.onChange((value: any) => {
				// @ts-ignore - Direct assignment, might be read-only in TypeScript but works at runtime
				this.toneMappingEffect.averageLuminance = Number(value);
			});

		// Reinhard (Adaptive) folder
		const adaptiveFolder = toneMappingFolder.addFolder('Reinhard (Adaptive)');
		adaptiveFolder
			.add(params, 'resolution', [64, 128, 256, 512])
			.onChange((value: any) => {
				// @ts-ignore - Direct assignment for resolution
				this.toneMappingEffect.resolution = Number(value);
			});

		adaptiveFolder
			.add(params, 'adaptationRate', 0.001, 3.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Access adaptationRate
				this.toneMappingEffect.adaptationRate = Number(value);
			});

		adaptiveFolder
			.add(params, 'minLuminance', 0.001, 1.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Access minLuminance
				this.toneMappingEffect.minLuminance = Number(value);
			});

		// Blend settings
		toneMappingFolder.add(params, 'opacity', 0.0, 1.0, 0.01).onChange((value: any) => {
			blendMode.opacity.value = value;
		});

		toneMappingFolder
			.add(params, 'blendFunction', BlendFunction)
			.onChange((value: any) => {
				blendMode.setBlendFunction(Number(value));
			});
	}

	public createColorGradingEffects() {
		// Initialize all color grading effects with SKIP blend mode (disabled by default)
		this.colorAverageEffect = new ColorAverageEffect(BlendFunction.SKIP);
		this.sepiaEffect = new SepiaEffect({ blendFunction: BlendFunction.SKIP });

		this.brightnessContrastEffect = new BrightnessContrastEffect({
			blendFunction: BlendFunction.SKIP,
			brightness: 0.0,
			contrast: 0.0
		});

		this.hueSaturationEffect = new HueSaturationEffect({
			blendFunction: BlendFunction.SKIP,
			hue: 0.0,
			saturation: 0.4
		});

		// Add all effects in a single pass
		const colorGradingPass = new EffectPass(
			this.gl.camera,
			this.colorAverageEffect,
			this.sepiaEffect,
			this.brightnessContrastEffect,
			this.hueSaturationEffect
		);

		this.composer.addPass(colorGradingPass);

		// ************* GUI *************
		const colorGradingFolder = this.postprocessingFolder.addFolder('Color Grading');
		colorGradingFolder.close();

		// Color Average Effect Controls
		const colorAverageFolder = colorGradingFolder.addFolder('Color Average');
		colorAverageFolder
			.add(this.colorAverageEffect.blendMode.opacity, 'value', 0.0, 1.0, 0.01)
			.name('opacity')
			.onChange((value: any) => {
				this.colorAverageEffect.blendMode.opacity.value = value;
			});

		colorAverageFolder
			.add(
				{ blendMode: this.colorAverageEffect.blendMode.blendFunction },
				'blendMode',
				BlendFunction
			)
			.name('blend mode')
			.onChange((value: any) => {
				this.colorAverageEffect.blendMode.setBlendFunction(Number(value));
			});

		// Sepia Effect Controls
		const sepiaFolder = colorGradingFolder.addFolder('Sepia');
		sepiaFolder
			.add(this.sepiaEffect.blendMode.opacity, 'value', 0.0, 1.0, 0.01)
			.name('opacity')
			.onChange((value: any) => {
				this.sepiaEffect.blendMode.opacity.value = value;
			});

		sepiaFolder
			.add(
				{ blendMode: this.sepiaEffect.blendMode.blendFunction },
				'blendMode',
				BlendFunction
			)
			.name('blend mode')
			.onChange((value: any) => {
				this.sepiaEffect.blendMode.setBlendFunction(Number(value));
			});

		// Brightness & Contrast Controls
		const brightnessContrastFolder = colorGradingFolder.addFolder(
			'Brightness & Contrast'
		);
		brightnessContrastFolder
			.add({ brightness: 0.0 }, 'brightness', -1.0, 1.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Accessing uniforms
				this.brightnessContrastEffect.uniforms.get('brightness').value = value;
			});

		brightnessContrastFolder
			.add({ contrast: 0.0 }, 'contrast', -1.0, 1.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Accessing uniforms
				this.brightnessContrastEffect.uniforms.get('contrast').value = value;
			});

		brightnessContrastFolder
			.add(this.brightnessContrastEffect.blendMode.opacity, 'value', 0.0, 1.0, 0.01)
			.name('opacity')
			.onChange((value: any) => {
				this.brightnessContrastEffect.blendMode.opacity.value = value;
			});

		brightnessContrastFolder
			.add(
				{ blendMode: this.brightnessContrastEffect.blendMode.blendFunction },
				'blendMode',
				BlendFunction
			)
			.name('blend mode')
			.onChange((value: any) => {
				this.brightnessContrastEffect.blendMode.setBlendFunction(Number(value));
			});

		// Hue & Saturation Controls
		const hueSaturationFolder = colorGradingFolder.addFolder('Hue & Saturation');
		hueSaturationFolder
			.add({ hue: 0.0 }, 'hue', 0.0, Math.PI * 2.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Using setHue method
				if (typeof this.hueSaturationEffect.setHue === 'function') {
					this.hueSaturationEffect.setHue(value);
				} else {
					// @ts-ignore - Direct access to uniforms
					this.hueSaturationEffect.uniforms.get('hue').value = value;
				}
			});

		hueSaturationFolder
			.add({ saturation: 0.4 }, 'saturation', -1.0, 1.0, 0.001)
			.onChange((value: any) => {
				// @ts-ignore - Direct access to uniforms
				this.hueSaturationEffect.uniforms.get('saturation').value = value;
			});

		hueSaturationFolder
			.add(this.hueSaturationEffect.blendMode.opacity, 'value', 0.0, 1.0, 0.01)
			.name('opacity')
			.onChange((value: any) => {
				this.hueSaturationEffect.blendMode.opacity.value = value;
			});

		hueSaturationFolder
			.add(
				{ blendMode: this.hueSaturationEffect.blendMode.blendFunction },
				'blendMode',
				BlendFunction
			)
			.name('blend mode')
			.onChange((value: any) => {
				this.hueSaturationEffect.blendMode.setBlendFunction(Number(value));
			});

		// LUT3D Effect Controls
		const lutFolder = colorGradingFolder.addFolder('LUT 3D');

		// Define available LUTs
		const availableLUTs = {
			// identity: 'Identity',
			// 'png/bleach-bypass': 'Bleach Bypass',
			// 'png/candle-light': 'Candle Light',
			// 'png/cool-contrast': 'Cool Contrast',
			// 'png/warm-contrast': 'Warm Contrast',
			// 'png/desaturated-fog': 'Desaturated Fog',
			// 'png/evening': 'Evening',
			// 'png/fall': 'Fall',
			// 'png/filmic1': 'Filmic 1',
			// 'png/filmic2': 'Filmic 2',
			// 'png/matrix-green': 'Matrix Green',
			// 'png/strong-amber': 'Strong Amber'
			// CUBE and 3DL formats would need custom loaders
			// 'cube/cinematic': 'Cinematic (CUBE)',
			// 'cube/django-25': 'Django 25 (CUBE)',
			// '3dl/presetpro-cinematic': 'Cinematic (3DL)'
		};
	}

	public createOutlineEffect() {
		const outlineEffect = new OutlineEffect(this.gl.scene, this.gl.camera, {
			blendFunction: BlendFunction.SCREEN,
			edgeStrength: 2.5,
			pulseSpeed: 0.0,
			visibleEdgeColor: 0xffffff,
			hiddenEdgeColor: 0x22090a,
			height: 480,
			blur: false,
			xRay: true
		});
		console.log('Outline effect created:', outlineEffect);

		this.gl.scene.traverse((object) => {
			//@ts-ignore
			if (object.isMesh) {
				// Add all meshes to the outline selection
				// Set the outline selection for the effect
				outlineEffect.selection.add(object);
				console.log('Outline selection:', outlineEffect.selection);
			}
		});

		const outlinePass = new EffectPass(this.gl.camera, outlineEffect);
		this.composer.addPass(outlinePass);

		// ************* GUI *************
		const outlineFolder = this.postprocessingFolder.addFolder('Outline');
		outlineFolder.close();

		const params = {
			resolution: outlineEffect.height,
			blurriness: 0,
			edgeStrength: outlineEffect.edgeStrength,
			pulseSpeed: outlineEffect.pulseSpeed,
			visibleEdgeColor: outlineEffect.visibleEdgeColor.getHex(),
			hiddenEdgeColor: outlineEffect.hiddenEdgeColor.getHex(),
			blur: outlineEffect.blur,
			xRay: outlineEffect.xRay,
			opacity: outlineEffect.blendMode.opacity.value,
			blendFunction: outlineEffect.blendMode.blendFunction
		};

		outlineFolder
			.add(params, 'resolution', [240, 360, 480, 720, 1080])
			.onChange((value: number) => {
				// @ts-ignore
				outlineEffect.resolution.height = Number(value);
			});

		outlineFolder
			.add(params, 'blurriness', KernelSize.VERY_SMALL, KernelSize.HUGE + 1, 1)
			.onChange((value: number) => {
				// @ts-ignore
				outlineEffect.blurPass.enabled = value > 0;
				// @ts-ignore
				outlineEffect.blurPass.blurMaterial.kernelSize = value - 1;
			});

		outlineFolder
			.add(params, 'edgeStrength', 0.0, 10.0, 0.01)
			.onChange((value: number) => {
				// @ts-ignore
				outlineEffect.uniforms.get('edgeStrength').value = value;
			});

		outlineFolder.add(params, 'pulseSpeed', 0.0, 2.0, 0.01).onChange((value: number) => {
			outlineEffect.pulseSpeed = value;
		});

		outlineFolder.addColor(params, 'visibleEdgeColor').onChange((value: number) => {
			outlineEffect.visibleEdgeColor.setHex(value);
		});

		outlineFolder.addColor(params, 'hiddenEdgeColor').onChange((value: number) => {
			outlineEffect.hiddenEdgeColor.setHex(value);
		});

		outlineFolder.add(params, 'xRay').onChange((value: boolean) => {
			outlineEffect.xRay = value;
		});

		outlineFolder.add(params, 'opacity', 0.0, 1.0, 0.01).onChange((value: number) => {
			outlineEffect.blendMode.opacity.value = value;
		});

		outlineFolder
			.add(params, 'blendFunction', BlendFunction)
			.onChange((value: number) => {
				outlineEffect.blendMode.setBlendFunction(Number(value));
			});

		return outlineEffect;
	}

	public createHologramEffect() {
		const gl = this.gl;

		const params = {
			scanlineFrequency: 1200.0,
			scanlineSpeed: 7.0,
			glitchIntensity: 0.1,
			colorShiftIntensity: 1.0,
			hologramColor: new Color('#00FFFF'), // Cyan color
			brightness: 0,
			contrast: 1,
			noiseScale: 0.05
		};

		class HologramEffect extends Effect {
			constructor() {
				const uniforms = new Map();
				uniforms.set('time', new Uniform(0.0));
				uniforms.set('scanlineFrequency', new Uniform(300.0));
				uniforms.set('scanlineSpeed', new Uniform(2.0));
				uniforms.set('glitchIntensity', new Uniform(0.5));
				uniforms.set('colorShiftIntensity', new Uniform(1.0));
				uniforms.set('hologramColor', new Uniform(new Color('#00FFFF'))); // Cyan color
				uniforms.set('brightness', new Uniform(0.1));
				uniforms.set('contrast', new Uniform(1.2));
				uniforms.set('noiseScale', new Uniform(0.05));

				super(
					'HologramEffect',
					`
					uniform float time;
					uniform float scanlineFrequency;
					uniform float scanlineSpeed;
					uniform float glitchIntensity;
					uniform float colorShiftIntensity;
					uniform vec3 hologramColor;
					uniform float brightness;
					uniform float contrast;
					uniform float noiseScale;
					
					// Noise function
					float random(vec2 st) {
						return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
					}
					
					void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
						vec2 screenUV = uv;
						
						// Scanlines effect
						float scanline = sin(screenUV.y * scanlineFrequency + time * scanlineSpeed);
						scanline = smoothstep(0.0, 1.0, scanline * 0.5 + 0.5);
						
						// Glitch/distortion effect
						float glitch = random(vec2(floor(time * 10.0), floor(screenUV.y * 100.0))) * glitchIntensity;
						screenUV.x += glitch * 0.02;
						
						// Color shift (chromatic aberration)
						vec4 color = inputColor;
						if (colorShiftIntensity > 0.0) {
							float shift = colorShiftIntensity * 0.003;
							color.r = texture2D(inputBuffer, screenUV + vec2(shift, 0.0)).r;
							color.g = inputColor.g;
							color.b = texture2D(inputBuffer, screenUV - vec2(shift, 0.0)).b;
						}
						
						// Apply hologram color tint
						color.rgb = mix(color.rgb, hologramColor, 0.3);
						
						// Brightness and contrast adjustment
						color.rgb = (color.rgb - 0.5) * contrast + 0.5 + brightness;
						
						// Apply scanlines
						color.rgb *= mix(0.8, 1.2, scanline);
						
						// Add noise/grain
						float noise = random(screenUV + time) * 0.1;
						color.rgb += noise * noiseScale;
						
						outputColor = vec4(color.rgb, color.a);
					}
					`,
					{
						blendFunction: BlendFunction.NORMAL,
						uniforms: uniforms
					}
				);
			}
		}

		this.hologramEffect = new HologramEffect();
		this.hologramEffect.uniforms.get('scanlineFrequency')!.value =
			params.scanlineFrequency;
		this.hologramEffect.uniforms.get('scanlineSpeed')!.value = params.scanlineSpeed;
		this.hologramEffect.uniforms.get('glitchIntensity')!.value = params.glitchIntensity;
		this.hologramEffect.uniforms.get('colorShiftIntensity')!.value =
			params.colorShiftIntensity;
		this.hologramEffect.uniforms.get('hologramColor')!.value.set(params.hologramColor);
		this.hologramEffect.uniforms.get('brightness')!.value = params.brightness;
		this.hologramEffect.uniforms.get('contrast')!.value = params.contrast;
		this.hologramEffect.uniforms.get('noiseScale')!.value = params.noiseScale;
		this.hologramEffect.uniforms.get('time')!.value = 0.0; // Initialize time uniform
		const hologramPass = new EffectPass(this.gl.camera, this.hologramEffect);
		this.composer.addPass(hologramPass);

		// GUI Controls
		const hologramFolder = this.postprocessingFolder.addFolder('Hologram Effect');
		hologramFolder.close();

		hologramFolder
			.add(params, 'scanlineFrequency', 50.0, 500.0)
			.onChange((value: number) => {
				this.hologramEffect!.uniforms.get('scanlineFrequency')!.value = value;
			});

		hologramFolder.add(params, 'scanlineSpeed', 0.0, 5.0).onChange((value: number) => {
			this.hologramEffect!.uniforms.get('scanlineSpeed')!.value = value;
		});

		hologramFolder.add(params, 'glitchIntensity', 0.0, 2.0).onChange((value: number) => {
			this.hologramEffect!.uniforms.get('glitchIntensity')!.value = value;
		});

		hologramFolder
			.add(params, 'colorShiftIntensity', 0.0, 3.0)
			.onChange((value: number) => {
				this.hologramEffect!.uniforms.get('colorShiftIntensity')!.value = value;
			});

		hologramFolder.addColor(params, 'hologramColor').onChange((value: string | Color) => {
			this.hologramEffect!.uniforms.get('hologramColor')!.value.set(value);
		});

		hologramFolder.add(params, 'brightness', -0.5, 0.5).onChange((value: number) => {
			this.hologramEffect!.uniforms.get('brightness')!.value = value;
		});

		hologramFolder.add(params, 'contrast', 0.5, 2.0).onChange((value: number) => {
			this.hologramEffect!.uniforms.get('contrast')!.value = value;
		});

		hologramFolder.add(params, 'noiseScale', 0.0, 0.2).onChange((value: number) => {
			this.hologramEffect!.uniforms.get('noiseScale')!.value = value;
		});

		return this.hologramEffect;
	}
}