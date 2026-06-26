import * as THREE from 'three'

export interface Vertex {
    position: THREE.Vector3;
    normal: THREE.Vector3;
    uv?: THREE.Vector2;
}

export interface Face {
    a: Vertex;
    b: Vertex;
    c: Vertex;
}

export class GeometryReader {
	public mesh: THREE.Mesh;

	public static read(mesh: THREE.Mesh): Face[] {
		const geometry = mesh.geometry as THREE.BufferGeometry;

		const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
		const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
		const uvs = geometry.getAttribute('uv') as THREE.BufferAttribute;
		const index = geometry.getIndex();

		const faces: Face[] = [];

		if (!index) {
			for (let i = 0; i < positions.count; i += 3) {
				faces.push({
					a: this.readVertex(i, positions, normals, uvs, mesh),
					b: this.readVertex(i + 1, positions, normals, uvs, mesh),
					c: this.readVertex(i + 2, positions, normals, uvs, mesh)
				});
			}

			return faces;
		}

		for (let i = 0; i < index.count; i += 3) {
			const i0 = index.getX(i);
			const i1 = index.getX(i + 1);
			const i2 = index.getX(i + 2);

			faces.push({
				a: this.readVertex(i0, positions, normals, uvs, mesh),
				b: this.readVertex(i1, positions, normals, uvs, mesh),
				c: this.readVertex(i2, positions, normals, uvs, mesh)
			});
		}

		return faces;
	}

	private static readVertex(
		i: number,
		positions: THREE.BufferAttribute,
		normals?: THREE.BufferAttribute,
		uvs?: THREE.BufferAttribute,
		mesh?: THREE.Mesh
	): Vertex {
		const position = new THREE.Vector3().fromBufferAttribute(positions, i);

		const normal = normals
			? new THREE.Vector3().fromBufferAttribute(normals, i)
			: new THREE.Vector3();

		const uv = uvs ? new THREE.Vector2().fromBufferAttribute(uvs, i) : undefined;

		if (mesh) {
			position.applyMatrix4(mesh.matrixWorld);
			const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);

			normal.applyNormalMatrix(normalMatrix);
		}

		return {
			position,
			normal,
			uv
		};
	}
}