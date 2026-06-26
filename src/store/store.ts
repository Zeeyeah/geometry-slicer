import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';

import { SelectiveBloomEffect } from 'postprocessing';

const needsPersist = false;

export const globalConfig = {
	fogColor: '#000000',
	fogDensity: 0.0,
	soundOn: true
};

export type GlobalStore = typeof globalConfig;
export type GlobalStoreActions = {
	update: (config: Partial<GlobalStore>) => void;
};

export const globalStore = createStore<GlobalStore & GlobalStoreActions>()(
	needsPersist
		? persist(
				(set) => ({
					...globalConfig,
					update: (state: Partial<GlobalStore>) => {
						set((oldState) => ({ ...oldState, ...state }));
					}
				}),
				{ name: 'global-storage' }
			)
		: (set) => ({
				...globalConfig,
				update: (state: Partial<GlobalStore>) => {
					set((oldState) => ({ ...oldState, ...state }));
				}
			})
);

export type PostStore = {
	bloomEffect: SelectiveBloomEffect | null;
	setBloomEffect: (bloomEffect: SelectiveBloomEffect) => void;
};
export const PostStore = createStore<PostStore>((set) => ({
	bloomEffect: null,
	setBloomEffect: (bloomEffect) => {
		set({ bloomEffect });
	}
}));
