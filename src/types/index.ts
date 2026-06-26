export interface Events {
	SpinEvent: () => void;
	resize: (width: number, height: number) => void;
	click: (x: number, y: number) => void;
}
