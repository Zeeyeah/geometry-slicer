import type { Color, Vector3 } from 'three';

export class LinearSpline {
	private _points: [number, any][] = [];

	constructor() {}

	AddPoint(t: number, d: { value: number } | Color | Vector3): void {
		this._points.push([t, d]);
	}

	GetLerpedNumber(t: number): number {
		const { p1, p2 } = this.getCurrentPoints(t);
		if (p1 === p2) {
			return this._points[p1][1].value;
		}
		return this._lerpNumber(
			(t - this._points[p1][0]) / (this._points[p2][0] - this._points[p1][0]),
			this._points[p1][1].value,
			this._points[p2][1].value
		);
	}

	GetLerpedColor(t: number): Color {
		const { p1, p2 } = this.getCurrentPoints(t);
		if (p1 === p2) {
			return this._points[p1][1];
		}
		return this._lerpColor(
			(t - this._points[p1][0]) / (this._points[p2][0] - this._points[p1][0]),
			this._points[p1][1],
			this._points[p2][1]
		);
	}

	GetLerpedVector(t: number): Vector3 {
		const { p1, p2 } = this.getCurrentPoints(t);
		if (p1 === p2) {
			return this._points[p1][1];
		}

		return this._lerpVector(
			(t - this._points[p1][0]) / (this._points[p2][0] - this._points[p1][0]),
			this._points[p1][1],
			this._points[p2][1]
		);
	}

	private _lerpNumber(t: number, a: number, b: number): number {
		return a + t * (b - a);
	}

	private _lerpColor(t: number, a: Color, b: Color): Color {
		const c = a.clone();
		return c.lerp(b, t);
	}

	private _lerpVector(t: number, a: Vector3, b: Vector3): Vector3 {
		const c = a.clone();
		return c.lerpVectors(a, b, t);
	}

	private getCurrentPoints(t: number): { p1: number; p2: number } {
		let p1 = 0;

		for (let i = 0; i < this._points.length; i++) {
			if (this._points[i][0] >= t) {
				break;
			}
			p1 = i;
		}
		const p2 = Math.min(this._points.length - 1, p1 + 1);

		return { p1, p2 };
	}
}
