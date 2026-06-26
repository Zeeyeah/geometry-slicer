import { TextureLoader, SRGBColorSpace, Texture, LoadingManager } from 'three';

const loadingManager = new LoadingManager();
const textureLoader = new TextureLoader(loadingManager);

export class Loader {
	constructor() {}

	loadTexture(textureSource: string) {
		const texture = textureLoader.load(
			textureSource
			// this.onLoaded.bind(this),
			// this.onProgress.bind(this),
			// this.onError.bind(this),
		);
		texture.colorSpace = SRGBColorSpace;
		return texture;
	}

	loadTextures<T extends string>(texturesSources: Record<T, string>) {
		return Object.entries<string>(texturesSources).reduce(
			(acc, [key, value]) => {
				acc[key as T] = this.loadTexture(value);
				acc[key as T].colorSpace = SRGBColorSpace;
				return acc;
			},
			{} as Record<T, Texture>
		);
	}

	private onLoaded() {
		// console.log("loaded");
	}

	private onProgress(progressEvent: ProgressEvent) {
		console.log(progressEvent);
	}

	private onError(err: unknown) {
		console.log('Error loading texture: ', err);
	}
}

export const loader = Object.freeze(new Loader());
