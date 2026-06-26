import { LoadingManager, TextureLoader } from 'three';
import { GLTFLoader, FBXLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';

export class LoadingHandler {
	static instance: LoadingHandler;

	public loadingManager: LoadingManager;
	public textureLoader: TextureLoader;
	public gltfLoader: GLTFLoader;
	public fbxLoader: FBXLoader;
	public dracoLoader: DRACOLoader;
	public showLoading = true;

	constructor() {
		if (LoadingHandler.instance) {
			throw new Error(
				'LoadingHandler instance has already been created. Call getInstance instead.'
			);
		}
		LoadingHandler.instance = this;
		this.loadingManager = new LoadingManager();

		this.textureLoader = new TextureLoader(this.loadingManager);

		// Setup Draco loader
		this.dracoLoader = new DRACOLoader();
		this.dracoLoader.setDecoderPath(
			'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
		);

		// Setup GLTF loader with Draco support
		this.gltfLoader = new GLTFLoader(this.loadingManager);
		this.gltfLoader.setDRACOLoader(this.dracoLoader);

		this.fbxLoader = new FBXLoader(this.loadingManager);
		this.setupLoading();
	}
	static getInstance() {
		if (!LoadingHandler.instance) {
			throw new Error(
				'LoadingHandler instance has not been created. Create a GL instance first.'
			);
		}
		return LoadingHandler.instance;
	}

	private setupLoading() {
		if (!this.showLoading) return;
		this.loadingManager.onLoad = () => {
			console.log('Loading complete!');
		};

		this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
			const progress = itemsLoaded / itemsTotal;
			console.log(progress, url);
		};

		this.loadingManager.onError = (url) => {
			console.log('Loading error:', url);
		};
	}

	public dispose() {
		// Dispose of Draco loader resources
		if (this.dracoLoader) {
			this.dracoLoader.dispose();
		}
	}
}
