import * as THREE from 'three';
import { Face } from './TriangleSplitter';

export class GeometryBuilder {
	public static build(faces: Face[]): THREE.BufferGeometry {
		const positions: number[] = [];
		const normals: number[] = [];
		const uvs: number[] = [];
		const indices: number[] = [];

		let vertexOffset = 0;

		for (const face of faces) {
			const vertices = [face.a, face.b, face.c];

			for (const vertex of vertices) {
				// Position
				positions.push(
					vertex.position.x,
					vertex.position.y,
					vertex.position.z
				);

				// Normal
				normals.push(
					vertex.normal.x,
					vertex.normal.y,
					vertex.normal.z
				);

				// UV
				if (vertex.uv) {
					uvs.push(
						vertex.uv.x,
						vertex.uv.y
					);
				}
			}

			indices.push(
				vertexOffset,
				vertexOffset + 1,
				vertexOffset + 2
			);

			vertexOffset += 3;
		}

		const geometry = new THREE.BufferGeometry();

		geometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(positions, 3)
		);

		geometry.setAttribute(
			'normal',
			new THREE.Float32BufferAttribute(normals, 3)
		);

		if (uvs.length > 0) {
			geometry.setAttribute(
				'uv',
				new THREE.Float32BufferAttribute(uvs, 2)
			);
		}

		geometry.setIndex(indices);

		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();

		return geometry;
	}
}