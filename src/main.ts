import Gl from '@/Gl';
import { emitter } from '@/utils/emitter';
import { globalStore } from '@/store/store';

import { Cube } from '@/components/Cube';
import { CameraManager } from './components/managers/CameraManager';
import { AirCar } from './components/AirCar/AirCar';
import { LoadingHandler } from './utils/LoadingHandler';
import LightingManager from './components/managers/LightingManager';
import PostManager from './components/managers/PostManager';
import UseGUI from './utils/UseGUI';
import AudioManager from './utils/AudioManager';

import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { VertexColorTest } from './components/VertexColorTest';
import { Bike } from './components/Bike/Bike';
import { GeometrySlicer } from './components/GeometrySlicer/GeometrySlicer';
import { UIManager } from './ui/UIManager';
import { CutManager } from './components/GeometrySlicer/CutManager';


type AppProps = {
	canvas: HTMLCanvasElement;
};

export class App {
	private gl: Gl;

	private useGUI = new UseGUI();
	private postManager: PostManager;

	private audioManager: AudioManager;

	constructor({ canvas }: AppProps) {
		this.gl = new Gl(canvas);
		this.gl.render();
		new LoadingHandler();

		this.postManager = new PostManager();
		// this.postManager.createBloomEffect({
		// 	luminanceSmoothing: 1,
		// 	intensity: 0.3,
		// 	radius: 0.12
		// });
		// this.postManager.createVignetteEffect();
		// this.postManager.createSMAAEffect();
		// this.postManager.createN8AOPostPass();
		// // this.postManager.createColorGradingEffects();
		// this.postManager.createToneMappingEffect({
		// 	mode: ToneMappingMode.ACES_FILMIC
		// });

		this.init();
		this.setupEventListeners();
		this.setupGUI();
		this.render();
	}

	private init() {
		const lights = new LightingManager();
		const camMan = new CameraManager();
		// camMan.camera.position.set(500, 150, 0);
		// camMan.orbitControls.target.set(0, 150, 0);

		// new Cube();
		// new Bike()
		// new AirCar();
		// new GeometrySlicer();
		new UIManager(new GeometrySlicer(), new CutManager(camMan));


		this.audioManager = new AudioManager();
		this.audioManager.loadSound('background', 'audio/music.mp3', 0.1, true);
		this.audioManager.loadSound('pop', 'audio/pop.mp3', 0.1, false);
	}

	private render() {
		this.gl.useFrame(() => {
			this.postManager.render();
			// this.gl.renderer.render(this.gl.scene, this.gl.camera);
		});
	}

	private setupGUI() {
		const element = UseGUI.getInstance().domElement;
		UseGUI.getInstance().close();
		// element.style.display = 'none';
		const fogFolder = UseGUI.getInstance().addFolder('Fog');
		fogFolder.addColor(globalStore.getState(), 'fogColor').onChange((value: any) => {
			globalStore.setState({ fogColor: value });
		});
		fogFolder
			.add(globalStore.getState(), 'fogDensity', 0, 0.5, 0.01)
			.onChange((value: any) => {
				globalStore.setState({ fogDensity: value });
			});
		this.useGUI.addButton('SpinEvent', () => {
			emitter.emit('SpinEvent');
			this.audioManager.playSound('pop');
			this.audioManager.toggleSounds();
		});
	}

	private setupEventListeners() {
		window.addEventListener('resize', () => {
			this.gl.resize(window.innerWidth, window.innerHeight);
			emitter.emit('resize', window.innerWidth, window.innerHeight);
		});
		// window.addEventListener('click', (e) => {
		// 	emitter.emit('click', e.clientX, e.clientY);

		// 	// this.audioManager.playSound('background');
		// 	console.log(this.gl.renderer.info.render);
		// });
	}
}

new App({
	canvas: document.querySelector('#webgl') as HTMLCanvasElement
});
