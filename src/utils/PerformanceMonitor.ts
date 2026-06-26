import Gl from '@/Gl';

type PerformanceMonitorProps = {
	ms?: number;
	iterations?: number;
	threshold?: number;
	bounds?: (refreshrate: number) => [lower: number, upper: number];
	flipflops?: number;
	factor?: number;
	step?: number;
	onIncline?: (monitor: PerformanceMonitor) => void;
	onDecline?: (monitor: PerformanceMonitor) => void;
	onChange?: (monitor: PerformanceMonitor) => void;
	onFallback?: (monitor: PerformanceMonitor) => void;
};

type PMSubscriptionOptions = {
	onIncline: (monitor: PerformanceMonitor) => void;
	onDecline: (monitor: PerformanceMonitor) => void;
	onChange: (monitor: PerformanceMonitor) => void;
	onFallback: (monitor: PerformanceMonitor) => void;
};

export class PerformanceMonitor {
	fps: number;
	factor: number;
	refreshrate: number;
	frames: number[];
	averages: number[];
	index: number;
	flipped: number;
	fallback: boolean;
	subscriptions: Map<Symbol, Partial<PMSubscriptionOptions>>;

	gl: Gl;

	constructor({
		iterations = 10,
		ms = 250,
		threshold = 0.75,
		step = 0.1,
		factor: _factor = 0.5,
		flipflops = Infinity,
		bounds = (refreshrate) => (refreshrate > 100 ? [60, 100] : [40, 60]),
		onIncline,
		onDecline,
		onChange,
		onFallback
	}: PerformanceMonitorProps = {}) {
		this.fps = 0;
		this.index = 0;
		this.factor = _factor;
		this.flipped = 0;
		this.refreshrate = 0;
		this.fallback = false;
		this.frames = [];
		this.averages = [];
		this.subscriptions = new Map();

		this.gl = Gl.getInstance();

		const decimalPlacesRatio = Math.pow(10, 0);
		let lastFactor = 0;

		this.gl.useFrame(() => {
			// If the fallback has been reached do not continue running samples
			if (this.fallback) return;

			if (this.averages.length < iterations) {
				this.frames.push(performance.now());

				const msPassed = this.frames[this.frames.length - 1] - this.frames[0];

				if (msPassed >= ms) {
					this.fps =
						Math.round((this.frames.length / msPassed) * 1000 * decimalPlacesRatio) /
						decimalPlacesRatio;

					this.refreshrate = Math.max(this.refreshrate, this.fps);
					this.averages[this.index++ % iterations] = this.fps;

					if (this.averages.length === iterations) {
						const [lower, upper] = bounds(this.refreshrate);

						const upperBounds = this.averages.filter((value) => value >= upper);
						const lowerBounds = this.averages.filter((value) => value < lower);

						// Trigger incline when more than -threshold- avgs exceed the upper bound
						if (upperBounds.length > iterations * threshold) {
							this.factor = Math.min(1, this.factor + step);
							this.flipped++;
							if (onIncline) onIncline(this);
							this.subscriptions.forEach(
								(value) => value.onIncline && value.onIncline(this)
							);
						}
						// Trigger decline when more than -threshold- avgs are below the lower bound
						if (lowerBounds.length > iterations * threshold) {
							this.factor = Math.max(0, this.factor - step);
							this.flipped++;
							if (onDecline) onDecline(this);
							this.subscriptions.forEach(
								(value) => value.onDecline && value.onDecline(this)
							);
						}

						if (lastFactor !== this.factor) {
							lastFactor = this.factor;
							if (onChange) onChange(this);
							this.subscriptions.forEach(
								(value) => value.onChange && value.onChange(this)
							);
						}

						if (this.flipped > flipflops && !this.fallback) {
							this.fallback = true;
							if (onFallback) onFallback(this);
							this.subscriptions.forEach(
								(value) => value.onFallback && value.onFallback(this)
							);
						}
						this.averages = [];

						// Resetting the refreshrate creates more problems than it solves atm
						// this.refreshrate = 0
					}
					this.frames = [];
				}
			}
		});
	}

	subscribe(ref: Partial<PMSubscriptionOptions>) {
		const key = Symbol();
		this.subscriptions.set(key, ref);
		return () => this.subscriptions.delete(key);
	}
}
