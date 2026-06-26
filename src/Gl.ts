import {
	ACESFilmicToneMapping,
	AgXToneMapping,
	Clock,
	Color,
	FogExp2,
	LinearToneMapping,
	NoToneMapping,
	PCFSoftShadowMap,
	PerspectiveCamera,
	SRGBColorSpace,
	Scene,
	WebGLRenderer
} from 'three';
import Stats from 'stats-gl';

import { globalStore } from '@/store/store';

export class Gl {
	private static instance: Gl;

	canvas: HTMLCanvasElement;
	camera: PerspectiveCamera;
	scene: Scene;
	renderer: WebGLRenderer;

	stats = new Stats();
	clock = new Clock();
	delta = 0;
	rafID = 0;

	private frameCallbacks: (() => void)[] = [];

	constructor(canvas: HTMLCanvasElement) {
		if (Gl.instance) {
			throw new Error('GL instance has already been created. Call getInstance instead.');
		}
		Gl.instance = this;

		this.canvas = canvas;
		this.camera = new PerspectiveCamera(
			55,
			window.innerWidth / window.innerHeight,
			0.1,
			3000
		);
		this.camera.position.set(0, 0, 5);

		this.scene = new Scene();
		// this.scene.background = new Color(globalStore.getState().fogColor);
		this.scene.fog = new FogExp2(
			globalStore.getState().fogColor,
			globalStore.getState().fogDensity
		);

		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			antialias: true,
			alpha: true,
			depth: true,
			precision: 'highp'
		});

		this.setupRenderer();
		// this.setupStats();

		globalStore.subscribe((store) => {
			this.scene.background = new Color(store.fogColor);
			(this.scene.fog as FogExp2).color.set(store.fogColor);
			(this.scene.fog as FogExp2).density = store.fogDensity;
		});
	}

	static getInstance(): Gl {
		if (!Gl.instance) {
			throw new Error('GL instance has not been created. Create a GL instance first.');
		}
		return Gl.instance;
	}

	useFrame(callback: () => void) {
		this.frameCallbacks.push(callback);
	}

	render() {
		this.delta = this.clock.getDelta();
		this.frameCallbacks.forEach((callback) => callback());
		this.stats.update();
		this.rafID = requestAnimationFrame(this.render.bind(this));
	}

	private setupRenderer() {
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.autoUpdate = true;
		this.renderer.shadowMap.type = PCFSoftShadowMap;
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.toneMapping = NoToneMapping;
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.scene.frustumCulled = true;
	}

	// private setupStats() {
	// 	this.stats.minimal = false;
	// 	this.stats.init(this.renderer);
	// 	// this.stats.dom.style.bottom = "0";
	// 	// this.stats.dom.style.top = "auto";
	// 	// this.stats.dom.style.left = "auto";
	// 	// this.stats.dom.style.right = "0";
	// 	this.stats.dom.style.display = 'block';
	// 	document.body.appendChild(this.stats.dom);
	// }
	public resize(width: number, height: number, dpr: number = 2) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dpr));
	}
}

export default Gl;
