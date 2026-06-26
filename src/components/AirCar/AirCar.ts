import {
	Color,
	EquirectangularReflectionMapping,
	Mesh,
	MeshBasicMaterial,
	MeshNormalMaterial,
	MeshPhongMaterial,
	MeshStandardMaterial,
	Object3D,
	Object3DEventMap,
	ShaderChunk,
	SphereGeometry,
	Texture,
	Vector3
} from 'three';
import Gl from '@/Gl';
import { LoadingHandler } from '@/utils/LoadingHandler';
import { PostStore } from '@/store/store';
import { RGBELoader } from 'three/examples/jsm/Addons.js';
import { CustomMaterial } from './CustomMaterial';

export class AirCar {
	private gl: Gl;
	private gltfLoader: any;
	private fbxLoader: any;
	private bodyMaterial: CustomMaterial;
	private seatMaterial: CustomMaterial;
	private headlightsMaterial: MeshBasicMaterial;

	Uniforms = {
		uTime: { value: 0 },
		NoiseTexture: { value: new Texture() },
		white: {
			uColor: { value: new Color('#ffffff') },
			uRoughness: { value: 1 },
			uMetalness: { value: 0 }
		},
		shinyBlack: {
			uColor: { value: new Color('#000000') },
			uRoughness: { value: 0.3 },
			uMetalness: { value: 0.9 }
		},
		mattBlack: {
			uColor: { value: new Color('#2c2c2c') },
			uRoughness: { value: 0.5 },
			uMetalness: { value: 0.1 }
		},
		glass: {
			uColor: { value: new Color('#009dff') },
			uRoughness: { value: 0.6 },
			uMetalness: { value: 0.7 },
			uAlpha: { value: 0.5 }
		},
		chairLeather1: {
			uColor: { value: new Color('#ff0000') },
			uRoughness: { value: 1 },
			uMetalness: { value: 0 }
		},
		chairLeather2: {
			uColor: { value: new Color('#0000ff') },
			uRoughness: { value: 1 },
			uMetalness: { value: 0 }
		},
		uGlowColor: { value: new Vector3(0.0, 0.44, 6.6) },
		uEnableHologramEffect: { value: 0.0 }
	};

	constructor() {
		this.gl = Gl.getInstance();
		const loadingHandler = LoadingHandler.getInstance();
		this.gltfLoader = loadingHandler.gltfLoader;
		this.fbxLoader = loadingHandler.fbxLoader;
		this.createMaterial();
		this.init();
	}

	private init() {
		const envMaps = [
			'/textures/env/env-2k.hdr',
			'/textures/env/dikhololo_night_1k.hdr',
			'/textures/env/empty_warehouse_01_1k.hdr',
			'/textures/env/forest_slope_1k.hdr',
			'/textures/env/kiara_1_dawn_1k.hdr',
			'/textures/env/lebombo_1k.hdr',
			'/textures/env/potsdamer_platz_1k.hdr'
		];
		const rgbeLoader = new RGBELoader();
		rgbeLoader.load(envMaps[1], (environmentMap) => {
			environmentMap.mapping = EquirectangularReflectionMapping;
			this.gl.scene.environment = environmentMap;
			this.gl.scene.environmentIntensity = 2.91;
		});

		this.gltfLoader.load(
			'/models/airCar.glb',
			(gltf: { scene: Object3D<Object3DEventMap> }) => {
				gltf.scene.traverse((child) => {
					if (child instanceof Mesh) {
						if (child.name === 'Chair') {
							child.material = this.seatMaterial;
						} else if (child.name === 'Light') {
							child.material = this.headlightsMaterial;
						} else {
							child.material = this.bodyMaterial;
						}
						child.geometry.attributes.color = child.geometry.attributes.color_1;
					}
				});
				gltf.scene.scale.set(1, 1, 1);
				gltf.scene.position.set(0, 2, 0);
				this.gl.scene.add(gltf.scene);
			},
			undefined,
			(error: any) => {
				console.error(error);
			}
		);
	}

	private logGeometryAttributes(mesh: Mesh) {
		const geometry = mesh.geometry;
		// if (geometry.attributes.position) {
		// 	console.log('Position:', geometry.attributes.position.array);
		// }
		// if (geometry.attributes.normal) {
		// 	console.log('Normal:', geometry.attributes.normal.array);
		// }
		// if (geometry.attributes.uv) {
		// 	console.log('UV:', geometry.attributes.uv.array);
		// }
		if (geometry.attributes.color) {
			const colorArray = geometry.attributes.color.array;
			const rChannels = [];
			for (let i = 0; i < colorArray.length; i += 3) {
				rChannels.push(colorArray[i]);
			}
			console.log('R Channel:', rChannels);

			const uniqueValues = [...new Set(rChannels)].sort((a, b) => a - b);
			console.log('Unique R Channel values (ascending):', uniqueValues);
		}
		// if (geometry.attributes.color_1) {
		// 	console.log('Color 1:', geometry.attributes.color_1.array);
		// }
	}

	private createMaterial() {
		// Create a custom material with configurable layers
		// Each layer corresponds to vertex color channels (R, G, B)
		this.bodyMaterial = new CustomMaterial({
			baseLayer: {
				color: this.Uniforms.white.uColor.value,
				roughness: this.Uniforms.white.uRoughness.value,
				metalness: this.Uniforms.white.uMetalness.value
			},
			layer1: {
				// Red channel - Shiny Black
				color: this.Uniforms.shinyBlack.uColor.value,
				roughness: this.Uniforms.shinyBlack.uRoughness.value,
				metalness: this.Uniforms.shinyBlack.uMetalness.value
			},
			layer2: {
				// Green channel - Matt Black
				color: this.Uniforms.mattBlack.uColor.value,
				roughness: this.Uniforms.mattBlack.uRoughness.value,
				metalness: this.Uniforms.mattBlack.uMetalness.value
			},
			layer3: {
				// Blue channel - Glass
				color: this.Uniforms.glass.uColor.value,
				roughness: this.Uniforms.glass.uRoughness.value,
				metalness: this.Uniforms.glass.uMetalness.value,
				alpha: this.Uniforms.glass.uAlpha.value
			}
		});
		this.seatMaterial = new CustomMaterial({
			baseLayer: {
				color: this.Uniforms.chairLeather1.uColor.value,
				roughness: this.Uniforms.chairLeather1.uRoughness.value,
				metalness: this.Uniforms.chairLeather1.uMetalness.value
			},
			layer1: {
				// Red channel - Shiny Black
				color: this.Uniforms.chairLeather2.uColor.value,
				roughness: this.Uniforms.chairLeather2.uRoughness.value,
				metalness: this.Uniforms.chairLeather2.uMetalness.value
			},
			layer2: {
				// Green channel - Matt Black
				color: this.Uniforms.mattBlack.uColor.value,
				roughness: this.Uniforms.mattBlack.uRoughness.value,
				metalness: this.Uniforms.mattBlack.uMetalness.value
			},
			layer3: {
				// Blue channel - Glass
				color: this.Uniforms.glass.uColor.value,
				roughness: this.Uniforms.glass.uRoughness.value,
				metalness: this.Uniforms.glass.uMetalness.value,
				alpha: 1
			}
		});

		this.headlightsMaterial = new MeshBasicMaterial({
			color: new Color(5, 5, 5)
		});

		// Example of updating a layer at runtime:
		// this.material.updateLayer(1, { color: new Color('#ff0000'), roughness: 0.1 });
	}
	public update() {}
}
