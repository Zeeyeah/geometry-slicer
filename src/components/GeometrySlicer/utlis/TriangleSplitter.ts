import * as THREE from 'three';

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

export class TriangleSplitter {

    public static split(faces: Face[], plane: THREE.Plane) {

        const front: Face[] = [];
        const back: Face[] = [];

        for (const face of faces) {

            const vertices = [face.a, face.b, face.c];

            const frontPoly: Vertex[] = [];
            const backPoly: Vertex[] = [];

            for (let i = 0; i < 3; i++) {

                const current = vertices[i];
                const next = vertices[(i + 1) % 3];

                const d0 = plane.distanceToPoint(current.position);
                const d1 = plane.distanceToPoint(next.position);

                // Add current vertex
                if (d0 >= 0) {
                    frontPoly.push(current);
                }

                if (d0 <= 0) {
                    backPoly.push(current);
                }

                // Edge crosses plane
                if ((d0 > 0 && d1 < 0) || (d0 < 0 && d1 > 0)) {

                    const intersection = this.intersectEdge(
                        current,
                        next,
                        plane
                    );

                    frontPoly.push(intersection);
                    backPoly.push(intersection);
                }
            }

            front.push(...this.buildFaces(frontPoly));
            back.push(...this.buildFaces(backPoly));
        }

        return {
            front,
            back
        };
    }

    private static intersectEdge(
        a: Vertex,
        b: Vertex,
        plane: THREE.Plane
    ): Vertex {

        const da = plane.distanceToPoint(a.position);
        const db = plane.distanceToPoint(b.position);

        const t = da / (da - db);

        return {

            position: new THREE.Vector3().lerpVectors(
                a.position,
                b.position,
                t
            ),

            normal: new THREE.Vector3()
                .lerpVectors(
                    a.normal,
                    b.normal,
                    t
                )
                .normalize(),

            uv:
                a.uv && b.uv
                    ? new THREE.Vector2().lerpVectors(
                          a.uv,
                          b.uv,
                          t
                      )
                    : undefined
        };
    }

    private static buildFaces(vertices: Vertex[]): Face[] {

        if (vertices.length < 3) {
            return [];
        }

        const faces: Face[] = [];

        for (let i = 1; i < vertices.length - 1; i++) {

            faces.push({

                a: vertices[0],

                b: vertices[i],

                c: vertices[i + 1]

            });

        }

        return faces;
    }

}