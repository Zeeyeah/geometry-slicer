import * as THREE from 'three';
import { BlurPass } from './BlurPass';
import { MeshReflectorMaterialImp } from './MeshReflectorMaterialImp';

export interface ReflectorMatOptions {
	/**
	 * How much blur mixes with surface roughness (default = 1)
	 */
	mixBlur?: number;
	/**
	 * Strength of the reflections
	 */
	mixStrength?: number;
	/**
	 * Off-buffer resolution, lower=faster, higher=better quality, slower
	 */
	resolution?: number;
	/**
	 * Blur ground reflections (width, height), 0 skips blur
	 */
	blur?: [number, number] | number;
	/**
	 * Lower edge for the depthTexture interpolation (default = 0)
	 */
	minDepthThreshold?: number;
	/**
	 * Upper edge for the depthTexture interpolation (default = 0)
	 */
	maxDepthThreshold?: number;
	/**
	 * Scale the depth factor (0 = no depth, default = 0)
	 */
	depthScale?: number;
	/**
	 * Adds a bias factor to the depthTexture before calculating the blur amount
	 * [blurFactor = blurTexture * (depthTexture + bias)]. It accepts values between 0 and 1, default is 0.25.
	 * An amount > 0 of bias makes sure that the blurTexture is not too sharp because of the multiplication with the depthTexture
	 */
	depthToBlurRatioBias?: number;
	/**
	 * Mirror environment, 0 = texture colors, 1 = pick up env colors
	 */
	mirror?: number;
	/**
	 * Amount of distortion based on the distortionMap texture
	 */
	distortion?: number;
	/**
	 * Contrast of the reflections
	 */
	mixContrast?: number;
	/**
	 * The red channel of this texture is used as the distortion map. Default is null
	 */
	distortionMap?: THREE.Texture;
	/**
	 * Offsets the virtual camera that projects the reflection. Useful when the reflective surface is some distance from the object's origin (default = 0)
	 */
	reflectorOffset?: number;
	/**
	 * Color tint for reflections
	 */
	color?: THREE.ColorRepresentation;
	/**
	 * Width of the reflection texture
	 */
	textureWidth?: number;
	/**
	 * Height of the reflection texture
	 */
	textureHeight?: number;
	/**
	 * Clip bias for the reflection texture
	 */
	clipBias?: number;
	/**
	 * Custom shader for the reflector material
	 */
	shader?: object;
	/**
	 * Texture colorSpace for the reflection
	 */
	colorSpace?: THREE.ColorSpace;
	/**
	 * Roughness of the surface material
	 */
	roughness?: number;
	/**
	 * Metalness of the surface material
	 */
	metalness?: number;
}

export class ReflectorMat extends THREE.Mesh {
	reflectorPlane: THREE.Plane;
	normal: THREE.Vector3;
	reflectorWorldPosition: THREE.Vector3;
	cameraWorldPosition: THREE.Vector3;
	rotationMatrix: THREE.Matrix4;
	lookAtPosition: THREE.Vector3;
	clipPlane: THREE.Vector4;
	view: THREE.Vector3;
	target: THREE.Vector3;
	q: THREE.Vector4;
	textureMatrix: THREE.Matrix4;
	virtualCamera: THREE.PerspectiveCamera;
	renderTarget: THREE.WebGLRenderTarget;
	renderTarget2: THREE.WebGLRenderTarget;
	fbo1: THREE.WebGLRenderTarget;
	fbo2: THREE.WebGLRenderTarget;
	blurPass: BlurPass;
	material: MeshReflectorMaterialImp;
	gl: THREE.WebGLRenderer;
	resolution: number;
	blur: [number, number];
	hasBlur: boolean;
	reflectorOffset: number;
	camera: THREE.Camera;
	scene: THREE.Scene;

	constructor(geometry: THREE.BufferGeometry, options: ReflectorMatOptions = {}) {
		const material = new MeshReflectorMaterialImp();
		super(geometry, material);

		// Set internal properties
		this.camera = null!;
		this.scene = null!;
		this.gl = null!;

		const {
			mixBlur = 0,
			mixStrength = 1,
			resolution = 256,
			blur = [0, 0],
			minDepthThreshold = 0.9,
			maxDepthThreshold = 1,
			depthScale = 0,
			depthToBlurRatioBias = 0.25,
			mirror = 0,
			distortion = 1,
			mixContrast = 1,
			distortionMap,
			reflectorOffset = 0,
			color = 0x7f7f7f,
			textureWidth = 512,
			textureHeight = 512,
			clipBias = 0,
			colorSpace = THREE.SRGBColorSpace,
			roughness = 0.5,
			metalness = 0.5
		} = options;

		// Array-fy blur to make code more maintainable
		this.blur = Array.isArray(blur) ? blur : [blur, blur];
		this.hasBlur = this.blur[0] + this.blur[1] > 0;
		this.resolution = resolution;
		this.reflectorOffset = reflectorOffset;

		// Initialize state variables
		this.reflectorPlane = new THREE.Plane();
		this.normal = new THREE.Vector3();
		this.reflectorWorldPosition = new THREE.Vector3();
		this.cameraWorldPosition = new THREE.Vector3();
		this.rotationMatrix = new THREE.Matrix4();
		this.lookAtPosition = new THREE.Vector3(0, 0, -1);
		this.clipPlane = new THREE.Vector4();
		this.view = new THREE.Vector3();
		this.target = new THREE.Vector3();
		this.q = new THREE.Vector4();
		this.textureMatrix = new THREE.Matrix4();
		this.virtualCamera = new THREE.PerspectiveCamera();

		// Create render targets
		this.renderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			colorSpace: colorSpace,
			depthBuffer: true,
			depthTexture: new THREE.DepthTexture(resolution, resolution),
			type: THREE.HalfFloatType
		});

		this.renderTarget2 = new THREE.WebGLRenderTarget(resolution, resolution, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			colorSpace: colorSpace,
			depthBuffer: true,
			depthTexture: new THREE.DepthTexture(resolution, resolution),
			type: THREE.HalfFloatType
		});

		// Set material properties
		this.material = material;
		this.material.mixBlur = mixBlur;
		this.material.mixStrength = mixStrength;
		this.material.minDepthThreshold = minDepthThreshold;
		this.material.maxDepthThreshold = maxDepthThreshold;
		this.material.depthScale = depthScale;
		this.material.depthToBlurRatioBias = depthToBlurRatioBias;
		this.material.mirror = mirror;
		this.material.distortion = distortion;
		this.material.mixContrast = mixContrast;
		this.material.roughness = roughness;
		this.material.metalness = metalness;

		// Set roughness and metalness if provided in options
		if (options.roughness !== undefined) {
			this.material.roughness = options.roughness;
		}

		if (options.metalness !== undefined) {
			this.material.metalness = options.metalness;
		}

		if (distortionMap) {
			this.material.distortionMap = distortionMap;
		}

		// This must be set after the material has been set
		this.material.color.set(color);

		this.onBeforeRender = this.onBeforeRenderHandler.bind(this);
	}

	initialize(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
		this.gl = gl;
		this.scene = scene;
		this.camera = camera;

		// Setup the blur pass if blur is enabled
		if (this.hasBlur) {
			this.setupBlurPass();
		}

		// Setup render targets for reflection
		this.setupRenderTargets();
	}

	setupBlurPass() {
		const { minDepthThreshold, maxDepthThreshold, depthScale, depthToBlurRatioBias } =
			this.material;

		this.blurPass = new BlurPass({
			gl: this.gl,
			resolution: this.resolution,
			width: this.gl.domElement.width,
			height: this.gl.domElement.height,
			minDepthThreshold,
			maxDepthThreshold,
			depthScale,
			depthToBlurRatioBias
		});

		// Setup additional render targets for blur effect
		this.setupBlurRenderTargets();
	}

	setupBlurRenderTargets() {
		// Set up FBO render targets for blur pass
		this.fbo1 = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			depthBuffer: false,
			type: THREE.HalfFloatType
		});

		this.fbo2 = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			depthBuffer: false,
			type: THREE.HalfFloatType
		});

		// Connect the render targets to the material
		this.material.tDiffuse = this.fbo1.texture;
		this.material.tDepth = this.renderTarget.depthTexture;

		if (this.hasBlur) {
			this.material.tDiffuseBlur = this.fbo2.texture;
			this.material.hasBlur = true;
		}

		this.material.textureMatrix = this.textureMatrix;
	}

	setupRenderTargets() {
		// Set up render targets for reflection
		this.renderTarget.depthTexture = new THREE.DepthTexture(
			this.resolution,
			this.resolution
		);
		this.renderTarget2.depthTexture = new THREE.DepthTexture(
			this.resolution,
			this.resolution
		);
	}

	onBeforeRenderHandler() {
		if (!this.gl || !this.camera) {
			console.error(
				'ReflectorMat: Renderer or camera not initialized. Call initialize() first.'
			);
			return;
		}

		this.reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
		this.cameraWorldPosition.setFromMatrixPosition(this.camera.matrixWorld);
		this.rotationMatrix.extractRotation(this.matrixWorld);
		this.normal.set(0, 0, 1);
		this.normal.applyMatrix4(this.rotationMatrix);

		// Offset the reflection plane by specified distance along normal
		this.reflectorWorldPosition.addScaledVector(this.normal, this.reflectorOffset);

		this.view.subVectors(this.reflectorWorldPosition, this.cameraWorldPosition);

		// Avoid rendering when reflector is facing away
		if (this.view.dot(this.normal) > 0) return;

		this.view.reflect(this.normal).negate();
		this.view.add(this.reflectorWorldPosition);

		this.rotationMatrix.extractRotation(this.camera.matrixWorld);
		this.lookAtPosition.set(0, 0, -1);
		this.lookAtPosition.applyMatrix4(this.rotationMatrix);
		this.lookAtPosition.add(this.cameraWorldPosition);

		this.target.subVectors(this.reflectorWorldPosition, this.lookAtPosition);
		this.target.reflect(this.normal).negate();
		this.target.add(this.reflectorWorldPosition);

		this.virtualCamera.position.copy(this.view);
		this.virtualCamera.up.set(0, 1, 0);
		this.virtualCamera.up.applyMatrix4(this.rotationMatrix);
		this.virtualCamera.up.reflect(this.normal);
		this.virtualCamera.lookAt(this.target);
		if ('far' in this.camera) {
			this.virtualCamera.far = (this.camera as THREE.PerspectiveCamera).far;
		}
		this.virtualCamera.updateMatrixWorld();
		this.virtualCamera.projectionMatrix.copy(this.camera.projectionMatrix);

		// Update the texture matrix
		this.textureMatrix.set(
			0.5,
			0.0,
			0.0,
			0.5,
			0.0,
			0.5,
			0.0,
			0.5,
			0.0,
			0.0,
			0.5,
			0.5,
			0.0,
			0.0,
			0.0,
			1.0
		);

		this.textureMatrix.multiply(this.virtualCamera.projectionMatrix);
		this.textureMatrix.multiply(this.virtualCamera.matrixWorldInverse);
		this.textureMatrix.multiply(this.matrixWorld);

		// Update projection matrix with new clip plane
		this.reflectorPlane.setFromNormalAndCoplanarPoint(
			this.normal,
			this.reflectorWorldPosition
		);
		this.reflectorPlane.applyMatrix4(this.virtualCamera.matrixWorldInverse);
		this.clipPlane.set(
			this.reflectorPlane.normal.x,
			this.reflectorPlane.normal.y,
			this.reflectorPlane.normal.z,
			this.reflectorPlane.constant
		);

		const projectionMatrix = this.virtualCamera.projectionMatrix;
		const q = this.q;
		q.x =
			(Math.sign(this.clipPlane.x) + projectionMatrix.elements[8]) /
			projectionMatrix.elements[0];
		q.y =
			(Math.sign(this.clipPlane.y) + projectionMatrix.elements[9]) /
			projectionMatrix.elements[5];
		q.z = -1.0;
		q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

		// Calculate the scaled plane vector
		this.clipPlane.multiplyScalar(2.0 / this.clipPlane.dot(q));

		// Replace the third row of the projection matrix
		projectionMatrix.elements[2] = this.clipPlane.x;
		projectionMatrix.elements[6] = this.clipPlane.y;
		projectionMatrix.elements[10] = this.clipPlane.z + 1.0;
		projectionMatrix.elements[14] = this.clipPlane.w;

		// Render reflection
		const currentRenderTarget = this.gl.getRenderTarget();
		const currentXrEnabled = this.gl.xr.enabled;
		const currentShadowAutoUpdate = this.gl.shadowMap.autoUpdate;

		this.gl.xr.enabled = false;
		this.gl.shadowMap.autoUpdate = false;

		// Hide the mesh from the virtual camera
		this.visible = false;

		// Render the reflection scene to the target
		this.gl.setRenderTarget(this.renderTarget);
		this.gl.clear();
		this.gl.render(this.scene, this.virtualCamera);

		if (this.hasBlur) {
			// Apply blur effect if enabled
			this.blurPass.render(this.gl, this.renderTarget, this.fbo1);

			// Apply additional blur if needed
			this.blurPass.render(this.gl, this.fbo1, this.fbo2);
		}

		// Make the mesh visible again
		this.visible = true;

		// Restore renderer state
		this.gl.xr.enabled = currentXrEnabled;
		this.gl.shadowMap.autoUpdate = currentShadowAutoUpdate;
		this.gl.setRenderTarget(currentRenderTarget);
	}

	dispose() {
		this.renderTarget.dispose();
		this.renderTarget2.dispose();

		if (this.blurPass) {
			this.fbo1?.dispose();
			this.fbo2?.dispose();
		}
	}
}
