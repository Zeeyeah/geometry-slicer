import Gl from '@/Gl';
import { emitter } from '@/utils/emitter';

import { CameraManager } from './components/managers/CameraManager';
import { LoadingHandler } from './utils/LoadingHandler';


import { GeometrySlicer } from './components/GeometrySlicer/GeometrySlicer';
import { UIManager } from './ui/UIManager';
import { CutManager } from './components/GeometrySlicer/CutManager';
import LightingManager from './components/managers/LightingManager';


type AppProps = {
	canvas: HTMLCanvasElement;
};

export class App {
	private gl: Gl;



	constructor({ canvas }: AppProps) {
		this.gl = new Gl(canvas);
		this.gl.render();
		new LoadingHandler();


		this.init();
		this.setupEventListeners();
		this.render();
	}

	private init() {
		const lights = new LightingManager();

		const camMan = new CameraManager();

		new UIManager(new GeometrySlicer(), new CutManager(camMan));

	}

	private render() {
		this.gl.useFrame(() => {
			// this.postManager.render();
			this.gl.renderer.render(this.gl.scene, this.gl.camera);
		});
	}


	private setupEventListeners() {
		window.addEventListener('resize', () => {
			this.gl.resize(window.innerWidth, window.innerHeight);
			emitter.emit('resize', window.innerWidth, window.innerHeight);
		});
	}
}

new App({
	canvas: document.querySelector('#webgl') as HTMLCanvasElement
});
