import Gl from '@/Gl';
import { ToolMode } from '@/ui/UIState';
import { CameraManager } from '../managers/CameraManager';
import * as THREE from 'three';
import { MeshCutter } from './MeshCutter';

export class CutManager {
    private gl: Gl;
    private camManager: CameraManager;
    private meshCutter: MeshCutter = new MeshCutter();

    private currentMode: ToolMode = ToolMode.DRAG;

    private start = new THREE.Vector2();
    private end = new THREE.Vector2();

    private isDragging = false;
    private isHoveringMesh = false;

    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();

    private planeHelper?: THREE.PlaneHelper;

    private lastPlane: THREE.Plane | null = null;
    private startWorldPos: THREE.Vector3 | null = null;
    private endWorldPos: THREE.Vector3 | null = null;

    private frontPiece: THREE.Mesh | null = null;
    private backPiece: THREE.Mesh | null = null;

    private draggedMesh: THREE.Mesh | null = null;
    private dragPlane: THREE.Plane | null = null;
    private dragOffset = new THREE.Vector3();
    private previousHoveredMesh: THREE.Mesh | null = null;

    constructor(camManager: CameraManager) {
        this.gl = Gl.getInstance();
        this.camManager = camManager;

        this.init();
    }

    private init() {
        this.onToolModeChanged(this.currentMode);
        this.setUpMouseListeners();
    }

    public setMode(mode: ToolMode) {
        if (this.currentMode === mode) return;

        this.currentMode = mode;
        this.onToolModeChanged(mode);
    }

    private onToolModeChanged(mode: ToolMode) {
        switch (mode) {
            case ToolMode.DRAG:
                this.gl.canvas.style.cursor = 'default';
                this.camManager.enableOrbitControls();
                this.clearPlanePreview();
                break;

            case ToolMode.CUT:
                this.gl.canvas.style.cursor = 'crosshair';
                this.camManager.disableOrbitControls();
                break;
        }
    }

    private setUpMouseListeners() {
        this.gl.canvas.addEventListener('mousemove', this.onMouseMove);
        this.gl.canvas.addEventListener('mousedown', this.onMouseDown);
        this.gl.canvas.addEventListener('mouseup', this.onMouseUp);
        this.gl.canvas.addEventListener('mouseleave', this.onMouseLeave);
    }

    
    private onMouseMove = (event: MouseEvent) => {

        const rect = this.gl.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // In CUT mode: draw the cutting plane preview
        if (this.currentMode === ToolMode.CUT) {
            if (!this.isDragging) return;

            this.end.set(event.clientX, event.clientY);
            this.updatePlanePreview();
            return;
        }

        // In DRAG mode: handle mesh dragging and hovering
        if (this.currentMode === ToolMode.DRAG) {
            if (this.isDragging && this.draggedMesh) {
                this.updateMeshDrag(event);
            } else {
                this.updateMeshHover();
            }
        }
    };

    private onMouseDown = (event: MouseEvent) => {
        const rect = this.gl.canvas.getBoundingClientRect();
        const clickPos = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        );

        // CUT mode: start cutting
        if (this.currentMode === ToolMode.CUT) {
            this.isDragging = true;
            this.start.set(event.clientX, event.clientY);
            this.end.copy(this.start);
            return;
        }

        // DRAG mode: start dragging mesh if hovering over one
        if (this.currentMode === ToolMode.DRAG) {
            if (this.isHoveringMesh && this.previousHoveredMesh) {
                this.startMeshDrag(this.previousHoveredMesh, clickPos);
            }
        }
    };

    private onMouseUp = () => {
        // CUT mode: perform cut
        if (this.currentMode === ToolMode.CUT && this.isDragging) {
            this.isDragging = false;
            const plane = this.generatePlane();

            if (plane) {
                this.performCut(plane);
            }
            return;
        }

        // DRAG mode: stop dragging
        if (this.currentMode === ToolMode.DRAG && this.isDragging) {
            this.stopMeshDrag();
        }
    };

    private onMouseLeave = () => {
        this.stopMeshDrag();
        this.clearMeshHover();
    };

    
    private updateMeshHover() {
        this.raycaster.setFromCamera(this.mouse, this.gl.camera);

        const meshes = this.getAllMeshes();
        const intersects = this.raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            const hitObject = intersects[0].object as THREE.Mesh;
            const hitMesh = hitObject instanceof THREE.Mesh ? hitObject : null;

            if (hitMesh && hitMesh !== this.previousHoveredMesh) {
                this.clearMeshHover();
                this.setMeshHovered(hitMesh);
                this.previousHoveredMesh = hitMesh;
                this.isHoveringMesh = true;
            }
        } else {
            if (this.isHoveringMesh) {
                this.clearMeshHover();
            }
        }
    }

    private setMeshHovered(mesh: THREE.Mesh) {
        this.gl.canvas.style.cursor = 'grab';

        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x444444);
        }
    }


    private clearMeshHover() {
        if (this.previousHoveredMesh) {
            if (this.previousHoveredMesh.material instanceof THREE.MeshStandardMaterial) {
                (this.previousHoveredMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
        }

        this.previousHoveredMesh = null;
        this.isHoveringMesh = false;

        if (this.currentMode === ToolMode.DRAG) {
            this.gl.canvas.style.cursor = 'default';
        } else if (this.currentMode === ToolMode.CUT) {
            this.gl.canvas.style.cursor = 'crosshair';
        }
    }


    private startMeshDrag(mesh: THREE.Mesh, clickPos: THREE.Vector2) {
        this.draggedMesh = mesh;
        this.isDragging = true;

        this.camManager.disableOrbitControls();

        // Create a plane at the mesh's position, facing the camera
        const cameraDir = new THREE.Vector3();
        this.gl.camera.getWorldDirection(cameraDir);

        this.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            cameraDir.clone().negate().normalize(),
            mesh.position
        );

        // Calculate the offset between the mesh and where we clicked
        const clickWorldPos = new THREE.Vector3();
        this.raycaster.setFromCamera(clickPos, this.gl.camera);
        this.raycaster.ray.intersectPlane(this.dragPlane!, clickWorldPos);

        this.dragOffset.subVectors(mesh.position, clickWorldPos);

        this.gl.canvas.style.cursor = 'grabbing';

        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x666666);
        }
    }


    private updateMeshDrag(event: MouseEvent) {
        if (!this.draggedMesh || !this.dragPlane) return;

        // Get new mouse position
        const rect = this.gl.canvas.getBoundingClientRect();
        const mousePos = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        );

        // Cast ray and intersect with drag plane
        this.raycaster.setFromCamera(mousePos, this.gl.camera);
        const newWorldPos = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, newWorldPos);

        // Update mesh position with offset
        this.draggedMesh.position.addVectors(newWorldPos, this.dragOffset);
    }


    private stopMeshDrag() {
        if (!this.draggedMesh) return;

        this.isDragging = false;

        // Clear drag state
        if (this.draggedMesh.material instanceof THREE.MeshStandardMaterial) {
            (this.draggedMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }

        this.draggedMesh = null;
        this.dragPlane = null;

        // Re-enable orbit controls
        if (this.currentMode === ToolMode.DRAG) {
            this.camManager.enableOrbitControls();
            this.gl.canvas.style.cursor = 'default';
        }
    }


    private getAllMeshes(): THREE.Mesh[] {
        const meshes: THREE.Mesh[] = [];

        this.gl.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child !== this.frontPiece && child !== this.backPiece) {
                // Skip helper objects
                if (child instanceof THREE.PlaneHelper) return;
                meshes.push(child);
            } else if (
                (child === this.frontPiece || child === this.backPiece) &&
                child instanceof THREE.Mesh
            ) {
                meshes.push(child);
            }
        });

        return meshes;
    }


    private screenToWorld(screenPos: THREE.Vector2): THREE.Vector3 | null {
        const ndc = new THREE.Vector2(
            (screenPos.x / window.innerWidth) * 2 - 1,
            -(screenPos.y / window.innerHeight) * 2 + 1
        );

        this.raycaster.setFromCamera(ndc, this.gl.camera);

        const hits = this.raycaster.intersectObjects(
            this.gl.scene.children,
            true
        );

        if (hits.length > 0) {
            return hits[0].point;
        }

        const fallbackPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -5);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(fallbackPlane, intersection);

        return intersection;
    }

 
    private generatePlane(): THREE.Plane | null {
        const dragDistance = this.start.distanceTo(this.end);

        if (dragDistance < 5) return null;

        this.startWorldPos = this.screenToWorld(this.start);
        this.endWorldPos = this.screenToWorld(this.end);

        if (!this.startWorldPos || !this.endWorldPos) {
            console.warn('Failed to raycast screen positions to world space');
            return null;
        }

        const dragDirection = new THREE.Vector3()
            .subVectors(this.endWorldPos, this.startWorldPos)
            .normalize();

        const cameraForward = new THREE.Vector3();
        this.gl.camera.getWorldDirection(cameraForward);

        const planeNormal = new THREE.Vector3()
            .crossVectors(dragDirection, cameraForward)
            .normalize();

        if (planeNormal.length() < 0.1) {
            this.gl.camera.matrixWorld.extractBasis(
                planeNormal,
                new THREE.Vector3(),
                new THREE.Vector3()
            );
        }

        const plane = new THREE.Plane();
        const midpoint = new THREE.Vector3()
            .addVectors(this.startWorldPos, this.endWorldPos)
            .multiplyScalar(0.5);

        plane.setFromNormalAndCoplanarPoint(planeNormal, midpoint);

        this.lastPlane = plane;
        return plane;
    }


    private updatePlanePreview() {
        const plane = this.generatePlane();

        if (!plane) return;

        if (this.planeHelper) {
            this.gl.scene.remove(this.planeHelper);
            this.planeHelper.dispose();
        }

        this.planeHelper = new THREE.PlaneHelper(plane, 8, 0xff4444);
        this.gl.scene.add(this.planeHelper);
    }

    private clearPlanePreview() {
        if (this.planeHelper) {
            this.gl.scene.remove(this.planeHelper);
            this.planeHelper.dispose();
            this.planeHelper = undefined;
        }
    }

    private performCut(plane: THREE.Plane) {
        const meshToCut = this.findMeshToCut();

        if (!meshToCut || !meshToCut.geometry) {
            console.warn('No mesh found to cut');
            return;
        }

        const { frontMesh, backMesh } = this.meshCutter.cut(meshToCut, plane);

        meshToCut.visible = false;
        this.removeObjectFromScene(meshToCut);

        this.gl.scene.add(backMesh);
        this.gl.scene.add(frontMesh);

        this.frontPiece = frontMesh;
        this.backPiece = backMesh;

        this.separatePieces(plane, 0.01);
        this.clearPlanePreview();
    }

    private removeObjectFromScene(object: THREE.Object3D) {
        if (object.parent) {
            object.parent.remove(object);
        }
    }


    private separatePieces(plane: THREE.Plane, distance: number) {
        const offset = new THREE.Vector3().copy(plane.normal).multiplyScalar(distance);
        const negOffset = offset.clone().multiplyScalar(-1);

        if (this.frontPiece) {
            this.frontPiece.position.add(offset);
        }

        if (this.backPiece) {
            this.backPiece.position.add(negOffset);
        }
    }


    private findMeshToCut(): THREE.Mesh | null {
        let meshToCut: THREE.Mesh | null = null;

        this.gl.scene.traverse((child) => {
            if (meshToCut) return;

            if (
                child instanceof THREE.Mesh 
            ) {
                meshToCut = child;
            }
        });

        return meshToCut;
    }

}