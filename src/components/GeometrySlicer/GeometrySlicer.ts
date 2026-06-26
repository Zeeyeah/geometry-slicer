import Gl from '@/Gl';
import { LoadingHandler } from '@/utils/LoadingHandler';
import * as THREE from 'three';

export class GeometrySlicer {
    private gl: Gl;
    private gltfLoader: any;
    private whiteMaterial: THREE.MeshStandardMaterial;
    private backupModel: any;

    constructor() {
        this.gl = Gl.getInstance();

        const loadingHandler = LoadingHandler.getInstance();
        this.gltfLoader = loadingHandler.gltfLoader;

        this.init();
    }

    private init() {
        this.gl.camera.position.set(0, 0, 5);

        this.whiteMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide
        });
    }

    public loadDefaultModel(id: string) {
        console.log('Loading default model:', id);

        this.gltfLoader.load(`./models/default-models/${id}.glb`, (gltf: any) => {
            const model = gltf.scene;
            this.backupModel = model.clone(); 

            model.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = this.whiteMaterial;
                }
            });

            this.gl.scene.add(model);
        });
    }

    public loadUploadedModel(file: File) {
        console.log('Loading uploaded model:', file.name);

        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
            const arrayBuffer = event.target?.result;

            if (!(arrayBuffer instanceof ArrayBuffer)) return;

            this.gltfLoader.parse(arrayBuffer, '', (gltf: any) => {
                const model = gltf.scene;
                this.backupModel = model.clone(); 

                model.traverse((child: any) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.position.set(0, 0, 0);
                        child.material = this.whiteMaterial;
                    }
                });

                this.gl.scene.add(model);
            });
        };

        reader.readAsArrayBuffer(file);
    }

  public reset() {
    const meshesToRemove: THREE.Object3D[] = [];

    this.gl.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            meshesToRemove.push(child);
        }
    });

    meshesToRemove.forEach((mesh) => {
        mesh.parent?.remove(mesh);
    });

    if (!this.backupModel) return;

    const modelClone = this.backupModel.clone(true);

    modelClone.traverse((child: any) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.position.set(0, 0, 0);
            child.material = this.whiteMaterial;
        }
    });

    this.gl.scene.add(modelClone);

}
public clear() {
    const meshesToRemove: THREE.Object3D[] = [];

    this.gl.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            meshesToRemove.push(child);
        }
    });

    meshesToRemove.forEach((mesh) => {
        mesh.parent?.remove(mesh);
    });

}
}