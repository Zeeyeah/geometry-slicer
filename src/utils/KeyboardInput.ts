export class KeyboardInput {
	private static instance: KeyboardInput;
	private keyStates: Map<string, boolean> = new Map<string, boolean>();
	private keyEventListeners: Map<string, Set<() => void>> = new Map<
		string,
		Set<() => void>
	>();

	private constructor() {
		window.addEventListener('keydown', this.handleKeyDown.bind(this));
		window.addEventListener('keyup', this.handleKeyUp.bind(this));
	}

	public static getInstance(): KeyboardInput {
		if (!KeyboardInput.instance) {
			KeyboardInput.instance = new KeyboardInput();
		}
		return KeyboardInput.instance;
	}

	public isKeyDown(key: string): boolean {
		return this.keyStates.get(key) || false;
	}

	private handleKeyDown(event: KeyboardEvent): void {
		const key = event.code;
		this.keyStates.set(key, true);
		this.triggerKeyListeners(key);
	}

	private handleKeyUp(event: KeyboardEvent): void {
		const key = event.code;
		this.keyStates.set(key, false);
	}

	public addKeyListener(key: string, callback: () => void): void {
		if (!this.keyEventListeners.has(key)) {
			this.keyEventListeners.set(key, new Set<() => void>());
		}
		this.keyEventListeners.get(key)?.add(callback);
	}

	public removeKeyListener(key: string, callback: () => void): void {
		const listeners = this.keyEventListeners.get(key);
		if (listeners) {
			listeners.delete(callback);
		}
	}

	private triggerKeyListeners(key: string): void {
		const listeners = this.keyEventListeners.get(key);
		if (listeners) {
			listeners.forEach((listener) => listener());
		}
	}
}
