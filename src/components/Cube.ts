import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	MeshNormalMaterial,
	Color,
	MeshPhongMaterial,
	ShaderChunk,
	ShaderMaterial,
	MeshStandardMaterial,
	Vector3,
	InstancedMesh,
	Matrix4,
	Quaternion
} from 'three';
import Gl from '@/Gl';
import gsap from 'gsap';
import { emitter } from '@/utils/emitter';
import { PostStore } from '@/store/store';

export class Cube {
	private gl: Gl;
	mesh: Mesh;

	Uniforms = {
		uProgress: { value: 0 },
		uReverse: { value: 0 }
	};

	constructor() {
		this.gl = Gl.getInstance();
		this.init();
	}

	private init() {
		const count = 1;
		this.createInstances(
			count,
			new Vector3(-10, 10, (1 - count) * 20),
			new Vector3(4, 1, 1)
		);
		this.createInstances(
			count,
			new Vector3(10, 10, (1 - count) * 20),
			new Vector3(1, 4, 1)
		);
		this.createInstances(
			count,
			new Vector3(0, 10, (1 - count) * 20),
			new Vector3(1, 1, 4)
		);

		this.createInstances(
			count,
			new Vector3(-10, 0, (1 - count) * 20),
			new Vector3(4, 4, 1)
		);
		this.createInstances(
			count,
			new Vector3(10, 0, (1 - count) * 20),
			new Vector3(1, 4, 4)
		);
		this.createInstances(
			count,
			new Vector3(0, 0, (1 - count) * 20),
			new Vector3(4, 1, 4)
		);

		this.createInstances(
			count,
			new Vector3(-10, -10, (1 - count) * 20),
			new Vector3(1, 2, 4)
		);
		this.createInstances(
			count,
			new Vector3(0, -10, (1 - count) * 20),
			new Vector3(4, 1.5, 1)
		);
		this.createInstances(
			count,
			new Vector3(10, -10, (1 - count) * 20),
			new Vector3(4, 1, 2)
		);
	}

	private createInstances(count: number, pos: Vector3, color: Vector3) {
		const geometry = new BoxGeometry(3, 3, 3);
		const material = this.createGlowMaterial(color);
		const mesh = new InstancedMesh(geometry, material, count);

		const matrix = new Matrix4();
		const position = new Vector3();
		const scale = new Vector3();
		const rotation = new Quaternion();
		for (let i = 0; i < count; i++) {
			position.set(0, 0, i * 20);
			scale.set(1, 1, 1);
			matrix.compose(position, rotation, scale);
			mesh.setMatrixAt(i, matrix);
		}
		mesh.instanceMatrix.needsUpdate = true;
		mesh.position.copy(pos);
		this.gl.scene.add(mesh);
		this.gl.useFrame(() => {
			mesh.rotation.y += 0.01;
		});
	}

	private createGlowMaterial(color: Vector3) {
		const material = new ShaderMaterial({
			transparent: true,
			uniforms: {
				emissiveColor: { value: color },
				uProgress: this.Uniforms.uProgress,
				uReverse: this.Uniforms.uReverse,
				uInstanceCount: { value: 40 }
			},
			vertexShader: `
					uniform float uProgress;
					uniform float uReverse;
					uniform float uInstanceCount;
					varying float vInstanceProgress;

					// simple vertex shader
					void main() {
						vec4 mPosition = modelMatrix * vec4( position, 1.0 );
						#ifdef USE_INSTANCING
							mPosition =  modelMatrix * instanceMatrix * vec4(position, 1.0);
						#endif
						gl_Position = projectionMatrix * viewMatrix * mPosition;

						// Calculate individual progress for each instance
						// float instanceOffset = float(gl_InstanceID) / uInstanceCount;
						// float instanceProgress = step(0.0,(uProgress - instanceOffset) * uInstanceCount);
						// vInstanceProgress = mix(instanceProgress, 1.0 - instanceProgress, uReverse);
					}
				`,
			fragmentShader: `
					uniform vec3 emissiveColor;
					varying float vInstanceProgress;

					void main() {
						float alpha = vInstanceProgress;
						gl_FragColor = vec4(emissiveColor, 1.);
					}
				`
		});
		return material;
	}

	public update() {
		this.gl.useFrame(() => {
			// this.mesh.rotation.y += 0.01;
			// this.mesh.rotation.y += 0.01;
		});
	}
}
