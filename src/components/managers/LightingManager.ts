import Gl from '@/Gl';
import {
	AmbientLight,
	DirectionalLight,
	DirectionalLightHelper,
	type Scene
} from 'three';

export default class LightingManager {
	private scene: Scene;
	private dirLight: DirectionalLight;
	private dirLight2: DirectionalLight;
	private ambLight: AmbientLight;
	private props = {
		dirColor: '#ffffff',
		dirLightIntensity: 2,
		ambLightColor: '#ffffff',
		ambLightIntensity: 1
	};

	constructor(needHelpers = false) {
		this.scene = Gl.getInstance().scene;
		this.dirLight = new DirectionalLight(
			this.props.dirColor,
			this.props.dirLightIntensity
		);
		this.dirLight.castShadow = true;
		this.dirLight.position.set(100, 100, 100);
		this.dirLight.shadow.camera.far = 200;
		this.dirLight.shadow.camera.left = -50;
		this.dirLight.shadow.camera.right = 50;
		this.dirLight.shadow.camera.top = 50;
		this.dirLight.shadow.camera.bottom = -50;
		this.dirLight.shadow.mapSize.set(2048, 2048);
		this.ambLight = new AmbientLight(
			this.props.ambLightColor,
			this.props.ambLightIntensity
		);

		this.dirLight.position.set(10, 10, 10);
		this.scene.add(this.dirLight);
		this.scene.add(this.ambLight);
		if (needHelpers) this.addHelpers();
	}
	private addHelpers() {
		const dirLightHelper = new DirectionalLightHelper(this.dirLight, 1);
		this.scene.add(dirLightHelper);
	}
}
