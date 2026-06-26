import { PerspectiveCamera } from 'three';
import Gl from '@/Gl';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraManager {
	private gl: Gl;
	public camera: PerspectiveCamera;
	public orbitControls: OrbitControls;

	constructor() {
		this.gl = Gl.getInstance();
		this.camera = this.gl.camera;
		// this.camera.position.set(0, 0, 3);
		// this.camera.position.set(6 * 4, 1 * 4, 8 * 4);
		this.camera.position.set(20, 5, 30);
		this.orbitControls = new OrbitControls(this.camera, this.gl.canvas);
		this.setupOrbitControls();
		this.setupClickListener();
		this.update();
	}

	public update() {
		this.gl.useFrame(() => {
			this.orbitControls.update();
		});
	}

	private setupOrbitControls() {
		this.orbitControls.enablePan = false;
		this.orbitControls.target.set(0, 0, 0);
		// this.orbitControls.enableDamping = true;
		// this.orbitControls.dampingFactor = 0.05;
		// this.orbitControls.enableZoom = true;
		this.orbitControls.enableRotate = true;
		// this.orbitControls.autoRotate = true;
		// this.orbitControls.autoRotateSpeed = -0.5;
		// this.orbitControls.maxPolarAngle = (90 * Math.PI) / 180;
		// this.orbitControls.minPolarAngle = (30 * Math.PI) / 180;
		// this.orbitControls.minDistance = 2;
		// this.orbitControls.maxDistance = 5;
	}

	public disableOrbitControls() {
		this.orbitControls.enabled = false;
		console.log('Orbit controls disabled');
	}

	public enableOrbitControls() {
		this.orbitControls.enabled = true;
		console.log('Orbit controls enabled');
	}

	private setupClickListener() {
		this.gl.canvas.addEventListener('click', () => {
			// this.logCameraInfo();
		});
	}

	private logCameraInfo() {
		console.log([this.camera.position.x, this.camera.position.y, this.camera.position.z]);
		console.log([this.camera.rotation.x, this.camera.rotation.y, this.camera.rotation.z]);
		console.log([
			this.orbitControls.target.x,
			this.orbitControls.target.y,
			this.orbitControls.target.z
		]);
	}
}
