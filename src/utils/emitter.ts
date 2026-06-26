import { createNanoEvents } from 'nanoevents';
import { Events } from '@/types';

const _emitter = createNanoEvents<Events>();

class Emitter {
	on<E extends keyof Events>(event: E, callback: Events[E]) {
		return _emitter.on(event, callback);
	}

	emit<E extends keyof Events>(event: E, ...args: Parameters<Events[E]>) {
		_emitter.emit(event, ...args);
	}
}

export const emitter = Object.freeze(new Emitter());
