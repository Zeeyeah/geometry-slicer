import { Color, MeshStandardMaterial, ShaderChunk, Vector3 } from 'three';

export interface MaterialLayer {
	color: Color;
	roughness: number;
	metalness: number;
	alpha?: number;
}

export interface CustomMaterialOptions {
	baseLayer?: MaterialLayer;
	layer1?: MaterialLayer; // Red channel
	layer2?: MaterialLayer; // Green channel
	layer3?: MaterialLayer; // Blue channel (glass)
}

export class CustomMaterial extends MeshStandardMaterial {
	private customUniforms: any = {};

	constructor(options: CustomMaterialOptions = {}) {
		// Set default base layer properties
		const baseLayer = options.baseLayer || {
			color: new Color('#ffffff'),
			roughness: 1,
			metalness: 0
		};

		super({
			color: baseLayer.color,
			roughness: baseLayer.roughness,
			metalness: baseLayer.metalness,
			vertexColors: true,
			transparent: true,
			opacity: 1.0
		});

		this.setupCustomUniforms(options);
		this.setupShaderModification();
	}

	private setupCustomUniforms(options: CustomMaterialOptions) {
		// Default layer configurations
		const defaultLayer1 = {
			color: new Color('#000000'),
			roughness: 0.3,
			metalness: 0.9
		};

		const defaultLayer2 = {
			color: new Color('#2c2c2c'),
			roughness: 0.5,
			metalness: 0.1
		};

		const defaultLayer3 = {
			color: new Color('#009dff'),
			roughness: 0.6,
			metalness: 0.7,
			alpha: 0.5
		};

		// Use provided options or defaults
		const layer1 = { ...defaultLayer1, ...options.layer1 };
		const layer2 = { ...defaultLayer2, ...options.layer2 };
		const layer3 = { ...defaultLayer3, ...options.layer3 };

		this.customUniforms = {
			uColor1: { value: layer1.color },
			uRoughness1: { value: layer1.roughness },
			uMetalness1: { value: layer1.metalness },
			uColor2: { value: layer2.color },
			uRoughness2: { value: layer2.roughness },
			uMetalness2: { value: layer2.metalness },
			uGlassColor: { value: layer3.color },
			uGlassRoughness: { value: layer3.roughness },
			uGlassMetalness: { value: layer3.metalness },
			uGlassAlpha: { value: layer3.alpha || 0.5 }
		};
	}

	private setupShaderModification() {
		this.onBeforeCompile = (shader) => {
			// Add custom uniforms to shader
			shader.uniforms = {
				...shader.uniforms,
				...this.customUniforms
			};

			// Custom fragment shader
			shader.fragmentShader = `
				// ****************** Custom Uniforms ******************
					uniform vec3 uColor1;
					uniform float uRoughness1;
					uniform float uMetalness1;	
					uniform vec3 uColor2;
					uniform float uRoughness2;
					uniform float uMetalness2;
					uniform vec3 uGlassColor;
					uniform float uGlassRoughness;
					uniform float uGlassMetalness;
					uniform float uGlassAlpha;
				// ****************** Custom Uniforms ******************

				#define STANDARD
				#ifdef PHYSICAL
					#define IOR
					#define USE_SPECULAR
				#endif
				uniform vec3 diffuse;
				uniform vec3 emissive;
				uniform float roughness;
				uniform float metalness;
				uniform float opacity;
				#ifdef IOR
					uniform float ior;
				#endif
				#ifdef USE_SPECULAR
					uniform float specularIntensity;
					uniform vec3 specularColor;
					#ifdef USE_SPECULAR_COLORMAP
						uniform sampler2D specularColorMap;
					#endif
					#ifdef USE_SPECULAR_INTENSITYMAP
						uniform sampler2D specularIntensityMap;
					#endif
				#endif
				#ifdef USE_CLEARCOAT
					uniform float clearcoat;
					uniform float clearcoatRoughness;
				#endif
				#ifdef USE_DISPERSION
					uniform float dispersion;
				#endif
				#ifdef USE_IRIDESCENCE
					uniform float iridescence;
					uniform float iridescenceIOR;
					uniform float iridescenceThicknessMinimum;
					uniform float iridescenceThicknessMaximum;
				#endif
				#ifdef USE_SHEEN
					uniform vec3 sheenColor;
					uniform float sheenRoughness;
					#ifdef USE_SHEEN_COLORMAP
						uniform sampler2D sheenColorMap;
					#endif
					#ifdef USE_SHEEN_ROUGHNESSMAP
						uniform sampler2D sheenRoughnessMap;
					#endif
				#endif
				#ifdef USE_ANISOTROPY
					uniform vec2 anisotropyVector;
					#ifdef USE_ANISOTROPYMAP
						uniform sampler2D anisotropyMap;
					#endif
				#endif
				varying vec3 vViewPosition;
				#include <common>
				#include <packing>
				#include <dithering_pars_fragment>
				#include <color_pars_fragment>
				#include <uv_pars_fragment>
				#include <map_pars_fragment>
				#include <alphamap_pars_fragment>
				#include <alphatest_pars_fragment>
				#include <alphahash_pars_fragment>
				#include <aomap_pars_fragment>
				#include <lightmap_pars_fragment>
				#include <emissivemap_pars_fragment>
				#include <iridescence_fragment>
				#include <cube_uv_reflection_fragment>
				#include <envmap_common_pars_fragment>
				#include <envmap_physical_pars_fragment>
				#include <fog_pars_fragment>
				#include <lights_pars_begin>
				#include <normal_pars_fragment>
				#include <lights_physical_pars_fragment>
				#include <transmission_pars_fragment>
				#include <shadowmap_pars_fragment>
				#include <bumpmap_pars_fragment>
				#include <normalmap_pars_fragment>
				#include <clearcoat_pars_fragment>
				#include <iridescence_pars_fragment>
				#include <roughnessmap_pars_fragment>
				#include <metalnessmap_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>
				void main() {
					vec4 diffuseColor = vec4( diffuse, opacity );
					#include <clipping_planes_fragment>
					ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
					vec3 totalEmissiveRadiance = emissive;
					#include <logdepthbuf_fragment>
					#include <map_fragment>
					// #include <color_fragment>

					// ****************** Custom Color Fragment ******************
						#if defined( USE_COLOR_ALPHA )
							diffuseColor.rgb = mix(diffuseColor.rgb, uColor1, vColor.r); // Red channel-- Layer 1
							diffuseColor.rgb = mix(diffuseColor.rgb, uColor2, vColor.g); // Green channel-- Layer 2
							diffuseColor.rgb = mix(diffuseColor.rgb, uGlassColor, vColor.b); // Blue channel-- Layer 3 (Glass)
						#elif defined( USE_COLOR )
							diffuseColor.rgb = mix(diffuseColor.rgb, uColor1, vColor.r);
							diffuseColor.rgb = mix(diffuseColor.rgb, uColor2, vColor.b);
						#endif
					// ****************** Custom Color Fragment ******************
					#include <alphamap_fragment>
					#include <alphatest_fragment>
					#include <alphahash_fragment>
					#include <roughnessmap_fragment>
					#include <metalnessmap_fragment>
					#include <normal_fragment_begin>
					#include <normal_fragment_maps>
					#include <clearcoat_normal_fragment_begin>
					#include <clearcoat_normal_fragment_maps>
					#include <emissivemap_fragment>
					#include <lights_physical_fragment>
					#include <lights_fragment_begin>
					#include <lights_fragment_maps>
					#include <lights_fragment_end>
					#include <aomap_fragment>
					vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
					vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
					#include <transmission_fragment>
					vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
					#ifdef USE_SHEEN
						float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
						outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
					#endif
					#ifdef USE_CLEARCOAT
						float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
						vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
						outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
					#endif
					#include <opaque_fragment>

					// ****************** Custom Opacity *******************
					gl_FragColor.a  = mix(diffuseColor.a, uGlassAlpha, vColor.b);
					// ****************** Custom Opacity *******************
					
					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>
					#include <dithering_fragment>
				}
			`;
		};

		this.needsUpdate = true;
	}

	// Method to update layer properties at runtime
	public updateLayer(layerIndex: 1 | 2 | 3, properties: Partial<MaterialLayer>) {
		if (layerIndex === 1) {
			if (properties.color) this.customUniforms.uColor1.value = properties.color;
			if (properties.roughness !== undefined)
				this.customUniforms.uRoughness1.value = properties.roughness;
			if (properties.metalness !== undefined)
				this.customUniforms.uMetalness1.value = properties.metalness;
		} else if (layerIndex === 2) {
			if (properties.color) this.customUniforms.uColor2.value = properties.color;
			if (properties.roughness !== undefined)
				this.customUniforms.uRoughness2.value = properties.roughness;
			if (properties.metalness !== undefined)
				this.customUniforms.uMetalness2.value = properties.metalness;
		} else if (layerIndex === 3) {
			if (properties.color) this.customUniforms.uGlassColor.value = properties.color;
			if (properties.roughness !== undefined)
				this.customUniforms.uGlassRoughness.value = properties.roughness;
			if (properties.metalness !== undefined)
				this.customUniforms.uGlassMetalness.value = properties.metalness;
			if (properties.alpha !== undefined)
				this.customUniforms.uGlassAlpha.value = properties.alpha;
		}
	}

	// Getter methods for accessing current values
	public getLayerProperties(layerIndex: 1 | 2 | 3): MaterialLayer {
		if (layerIndex === 1) {
			return {
				color: this.customUniforms.uColor1.value,
				roughness: this.customUniforms.uRoughness1.value,
				metalness: this.customUniforms.uMetalness1.value
			};
		} else if (layerIndex === 2) {
			return {
				color: this.customUniforms.uColor2.value,
				roughness: this.customUniforms.uRoughness2.value,
				metalness: this.customUniforms.uMetalness2.value
			};
		} else if (layerIndex === 3) {
			return {
				color: this.customUniforms.uGlassColor.value,
				roughness: this.customUniforms.uGlassRoughness.value,
				metalness: this.customUniforms.uGlassMetalness.value,
				alpha: this.customUniforms.uGlassAlpha.value
			};
		}
		throw new Error('Invalid layer index. Must be 1, 2, or 3.');
	}
}
