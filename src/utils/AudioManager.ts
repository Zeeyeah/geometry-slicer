import { globalStore } from '@/store/store';
import gsap from 'gsap';
import * as THREE from 'three';

export default class AudioManager {
	private static instance: AudioManager;

	public listener: THREE.AudioListener;
	private audioLoader: THREE.AudioLoader;
	private sounds: Map<string, THREE.Audio>;
	// private currentlyPlaying: string[] = [];

	constructor(loadingManager?: THREE.LoadingManager) {
		if (AudioManager.instance) {
			throw new Error(
				'AudioManager instance has already been created. Call getInstance instead.'
			);
		}
		AudioManager.instance = this;

		this.listener = new THREE.AudioListener();
		this.audioLoader = new THREE.AudioLoader();
		this.sounds = new Map();
	}

	public static getInstance(): AudioManager {
		if (!AudioManager.instance) {
			throw new Error(
				'AudioManager instance has not been created. Create a GL instance first.'
			);
		}
		return AudioManager.instance;
	}

	destroy() {
		this.sounds.forEach((_, key) => this.stopSound(key));
		this.sounds.clear();
		this.listener.clear();
	}

	public loadSound(
		key: string,
		url: string,
		volume: number,
		loop = false
	): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.sounds.has(key)) {
				// reject(new Error(`Sound with key '${key}' already exists.`));
				return;
			}

			this.audioLoader.load(
				url,
				(audioBuffer) => {
					const sound = new THREE.Audio(this.listener);
					sound.autoplay = false;
					sound.setBuffer(audioBuffer);
					sound.setVolume(volume);
					sound.loop = loop;
					this.sounds.set(key, sound);
					resolve();
				},
				undefined,
				reject
			);
		});
	}

	public toggleSounds() {
		const soundOn = globalStore.getState().soundOn;
		const currentMasterVolume = {
			volume: this.listener.getMasterVolume()
		};

		const resultVolume = soundOn ? 0 : 1;
		gsap.to(currentMasterVolume, {
			duration: 0.5,
			volume: resultVolume,
			onStart: () => {
				globalStore.setState({ soundOn: !soundOn });
			},
			onUpdate: () => {
				this.listener.setMasterVolume(currentMasterVolume.volume);
			},
			onComplete: () => {
				if (resultVolume === 0) {
				}
			}
		});
	}

	public playSound(key: string, volume = -1) {
		if (!globalStore.getState().soundOn) {
			return;
		}

		const sound = this.sounds.get(key);

		if (sound && !sound.isPlaying) {
			if (volume >= 0) sound.setVolume(volume);
			sound.play();
		}
	}

	public forcePlaySound(key: string, volume = -1): void {
		if (!globalStore.getState().soundOn) {
			return;
		}

		const sound = this.sounds.get(key);

		if (sound) {
			if (volume >= 0) sound.setVolume(volume);
			sound.stop();
			sound.play();
		}
	}

	public playDynamicSound(key: string, volume = -1): void {
		if (!globalStore.getState().soundOn) {
			return;
		}

		const sound = this.sounds.get(key);

		if (sound) {
			if (!sound.isPlaying) sound.play();
			if (volume >= 0) sound.setVolume(volume);
		}
	}

	public stopSound(key: string): void {
		const sound = this.sounds.get(key);

		if (sound) {
			sound.stop();
		}
	}

	public getVolume(key: string): number {
		const sound = this.sounds.get(key);

		if (sound) {
			return sound.getVolume();
		}

		return -1;
	}
}
