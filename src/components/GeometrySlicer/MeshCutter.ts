import * as THREE from 'three';
import { GeometryReader } from './utlis/GeometryReader';
import { TriangleSplitter } from './utlis/TriangleSplitter';
import { GeometryBuilder } from './utlis/GeometryBuilder';

export class MeshCutter {
	public cut(mesh: THREE.Mesh, plane: THREE.Plane) {
		const faces = GeometryReader.read(mesh);

		const { front, back } = TriangleSplitter.split(faces, plane);

		const frontGeometry = GeometryBuilder.build(front);
		const backGeometry = GeometryBuilder.build(back);

		const frontMesh = new THREE.Mesh(frontGeometry, mesh.material);
		const backMesh = new THREE.Mesh(backGeometry, mesh.material);

        return {
            frontMesh,
            backMesh
        };
	}
}
