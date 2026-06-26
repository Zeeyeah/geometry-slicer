import * as THREE from 'three';
import fragmentShader from './fragment.glsl?raw';
import vertexShader from './vertex.glsl?raw';
import {
	addBarycentricCoordinates,
	unindexBufferGeometry
} from './wireframeGeomtryUtils.js';

interface WireframeMaterialOptions {
	fill?: THREE.Color;
	stroke?: THREE.Color;
	thickness?: number;
	seeThrough?: boolean;
	dashEnabled?: boolean;
	dashRepeats?: number;
	dashLength?: number;
	dashAnimate?: boolean;
	noiseA?: boolean;
	noiseB?: boolean;
	dualStroke?: boolean;
	secondThickness?: number;
	squeeze?: boolean;
	squeezeMin?: number;
	squeezeMax?: number;
	dashOverlap?: boolean;
	insideAltColor?: boolean;
}

export class WireframeMaterial extends THREE.ShaderMaterial {
	constructor(options: WireframeMaterialOptions = {}) {
		const defaults = {
			fill: new THREE.Color('#ffffff'),
			stroke: new THREE.Color('#000000'),
			thickness: 0.01,
			seeThrough: false,
			dashEnabled: false,
			dashRepeats: 2.0,
			dashLength: 0.55,
			dashAnimate: false,
			noiseA: false,
			noiseB: false,
			dualStroke: false,
			secondThickness: 0.05,
			squeeze: false,
			squeezeMin: 0.1,
			squeezeMax: 1.0,
			dashOverlap: false,
			insideAltColor: true
		};

		const settings = { ...defaults, ...options };

		const uniforms = {
			time: { value: 0 },
			fill: { value: settings.fill },
			stroke: { value: settings.stroke },
			thickness: { value: settings.thickness },
			seeThrough: { value: settings.seeThrough },
			dashEnabled: { value: settings.dashEnabled },
			dashRepeats: { value: settings.dashRepeats },
			dashLength: { value: settings.dashLength },
			dashAnimate: { value: settings.dashAnimate },
			noiseA: { value: settings.noiseA },
			noiseB: { value: settings.noiseB },
			dualStroke: { value: settings.dualStroke },
			secondThickness: { value: settings.secondThickness },
			squeeze: { value: settings.squeeze },
			squeezeMin: { value: settings.squeezeMin },
			squeezeMax: { value: settings.squeezeMax },
			dashOverlap: { value: settings.dashOverlap },
			insideAltColor: { value: settings.insideAltColor }
		};

		super({
			transparent: true,
			side: THREE.DoubleSide,
			uniforms,
			fragmentShader,
			vertexShader
		});
	}

	// Helper method to update time for animations
	updateTime(time: number): void {
		this.uniforms.time.value = time;
	}

	// Helper methods for common operations
	setColors(fill: string | THREE.Color, stroke: string | THREE.Color): void {
		this.uniforms.fill.value.set(fill);
		this.uniforms.stroke.value.set(stroke);
	}

	setThickness(thickness: number): void {
		this.uniforms.thickness.value = thickness;
	}

	enableDash(enabled = true): void {
		this.uniforms.dashEnabled.value = enabled;
	}

	animateDash(animate = true): void {
		this.uniforms.dashAnimate.value = animate;
	}

	// Update multiple properties at once
	updateProperties(properties: Record<string, any>): void {
		Object.entries(properties).forEach(([key, value]) => {
			if (this.uniforms[key]) {
				this.uniforms[key].value = value;
			}
		});
	}
}

// Helper function to prepare geometry for wireframe rendering
export function prepareWireframeGeometry(
	geometry: THREE.BufferGeometry,
	edgeRemoval = true
): THREE.BufferGeometry {
	const clonedGeometry = geometry.clone();
	unindexBufferGeometry(clonedGeometry);
	addBarycentricCoordinates(clonedGeometry, edgeRemoval);
	return clonedGeometry;
}
