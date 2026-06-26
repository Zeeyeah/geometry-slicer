const randRange = (a = 0, b = 1) => {
	return Math.random() * (b - a) + a;
};

const randNormal = () => {
	const r = Math.random() + Math.random() + Math.random() + Math.random();
	return (r / 4.0) * 2.0 - 1;
};

const randInt = (a: number, b: number) => {
	return Math.round(Math.random() * (b - a) + a);
};

const lerp = (x: number, a: number, b: number) => {
	return x * (b - a) + a;
};

const smoothstep = (x: number, a: number, b: number) => {
	x = x * x * (3.0 - 2.0 * x);
	return x * (b - a) + a;
};

const smootherstep = (x: number, a: number, b: number) => {
	x = x * x * x * (x * (x * 6 - 15) + 10);
	return x * (b - a) + a;
};

const clamp = (x: number, a: number, b: number) => {
	return Math.min(Math.max(x, a), b);
};

const sat = (x: number) => {
	return Math.min(Math.max(x, 0.0), 1.0);
};
