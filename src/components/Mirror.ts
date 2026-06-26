import * as THREE from 'three';
import Gl from '@/Gl';
import { LoadingHandler } from '@/utils/LoadingHandler';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export default class Mirror {
	private gl: Gl;
	private gltfLoader: any;

	constructor() {
		this.gl = Gl.getInstance();
		const loadingHandler = LoadingHandler.getInstance();
		this.gltfLoader = loadingHandler.gltfLoader;
		this.init();
	}

	private init() {
		let geometry = new THREE.CircleGeometry(40, 64);
		let groundMirror = new Reflector(geometry, {
			clipBias: 0.1,
			textureWidth: window.innerWidth * window.devicePixelRatio,
			textureHeight: window.innerHeight * window.devicePixelRatio,
			color: '#eeeeee'
		});
		groundMirror.position.y = 0;
		groundMirror.rotateX(-Math.PI / 2);
		this.gl.scene.add(groundMirror);
	}

	public update() {
		this.gl.useFrame(() => {});
	}
}
