import { GUI } from 'lil-gui';
import type { StoreApi } from 'zustand/vanilla';

type ControlType = 'color';

export class CustomGUI extends GUI {
	constructor(props?: ConstructorParameters<typeof GUI>[0]) {
		super(props);
	}

	addButton(label: string, callback: () => void) {
		return this.add({ [label]: callback }, label).name(label);
	}

	addBinding<T extends Record<string, unknown>>(store: StoreApi<T>, key: keyof T) {
		return this._addBinding(store, key);
	}

	addColorBinding<T extends Record<string, unknown>>(store: StoreApi<T>, key: keyof T) {
		return this._addBinding(store, key, 'color');
	}

	private _addBinding<T extends Record<string, unknown>>(
		store: StoreApi<T>,
		key: keyof T,
		controlType?: ControlType
	) {
		const addFn = controlType === 'color' ? this.addColor : this.add;
		return addFn
			.call(this, store.getState(), key as string)
			.onChange((value: T[keyof T]) => {
				store.setState((state) => ({ ...state, [key]: value as unknown }));
			});
	}

	// overrides
	addFolder(title: string): CustomGUI {
		const folder = new CustomGUI({ parent: this, title });
		if (this.root._closeFolders) folder.close();
		return folder;
	}
}
