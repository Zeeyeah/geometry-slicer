import {
	Mesh,
	MeshBasicMaterial,
	MeshNormalMaterial,
	MeshPhongMaterial,
	MeshStandardMaterial,
	Object3D,
	Object3DEventMap,
	SphereGeometry
} from 'three';
import Gl from '@/Gl';
import { LoadingHandler } from '@/utils/LoadingHandler';

export class VertexColorTest {
	private gl: Gl;
	private gltfLoader: any;

	constructor() {
		this.gl = Gl.getInstance();
		const loadingHandler = LoadingHandler.getInstance();
		this.gltfLoader = loadingHandler.gltfLoader;
		this.init();
	}

	private init() {
		const material = new MeshBasicMaterial({
			vertexColors: true
		});

		this.gltfLoader.load(
			'/models/vTestMesh.glb',
			(gltf: { scene: Object3D<Object3DEventMap> }) => {
				gltf.scene.traverse((child) => {
					if (child instanceof Mesh) {
						child.material = material;
					}
				});
				gltf.scene.scale.set(1, 1, 1);
				// gltf.scene.position.set(0, 2, 0);
				this.gl.scene.add(gltf.scene);
			},
			undefined,
			(error: any) => {
				console.error(error);
			}
		);
	}

	public update() {}
}
