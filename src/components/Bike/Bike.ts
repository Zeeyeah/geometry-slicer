import {
  AnimationMixer,
  CircleGeometry,
  Color,
  DoubleSide,
  EquirectangularReflectionMapping,
  FogExp2,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
} from "three";
import Gl from "@/Gl";
import { LoadingHandler } from "@/utils/LoadingHandler";
import { GLTF, Reflector, RGBELoader } from "three/examples/jsm/Addons.js";
import VirtualScroll from "virtual-scroll";
import { ReflectorMat, ReflectorMatOptions } from "../ReflectorMat/ReflectorMat";

export class Bike {
  private gl: Gl;
  private gltfLoader: any;
  private mixer: AnimationMixer;
  private dracoLoader: any;
  private vs: any;
  private scrollY: number = 0;
  private targetScrollY: number = 0;
  private maxScroll: number = 10000; // Fallback; tune to your content
  private animationClip: any = null;
  private hasPlayed: boolean = false;
  private options: ReflectorMatOptions = {
  resolution: 512,  // Higher = better quality, but slower
  blur: [256, 256], // Blur passes (width, height); [0,0] disables blur
  mixBlur: 1,       // How much blur mixes with roughness (0-1)
  mixStrength: 1,   // Reflection strength (0-1)
  color: '#7f7f7f', // Tint for reflections
  roughness: 0,     // Surface roughness (0 = mirror-like)
  metalness: 1,     // Metalness (1 = metallic reflections)
};

  constructor() {
    this.gl = Gl.getInstance();
    const loadingHandler = LoadingHandler.getInstance();
    this.gltfLoader = loadingHandler.gltfLoader;
    this.dracoLoader = loadingHandler.dracoLoader;
    this.init();
  }

  private init() {
    this.gl.camera.position.set(0, 30, 0);
    this.gl.camera.lookAt(0, 0, 0);
    // this.gl.camera.fov = 75;
    this.gl.camera.updateProjectionMatrix();
    this.gl.scene.fog = new FogExp2(0x000000, 0.01);

    this.addEnvironment();
    this.addModel();
    this.addBike();
    this.addFloor();
    this.addLights();


    // Compute maxScroll from #content (assumes tall div in HTML)
    const contentEl = document.getElementById('content');
    if (contentEl) {
      this.maxScroll = contentEl.offsetHeight - window.innerHeight;
    } // Else use fallback

    // VirtualScroll setup
    this.vs = new VirtualScroll({
      el: window, // Target for events
      mouseMultiplier: 1,
      touchMultiplier: 2,
      preventTouch: false,
      useKeyboard: true,
      useTouch: true,
    });

    // Listen to scroll events
    this.vs.on((event: any) => {
      console.log('Event Y:', event.y, 'Delta Y:', event.deltaY); // Debug: Scroll to test
      this.targetScrollY = event.y; // Use cumulative y (negative for down)
    });

    // Resize to update maxScroll
    window.addEventListener('resize', () => {
      if (contentEl) {
        this.maxScroll = contentEl.offsetHeight - window.innerHeight;
      }
    });

    this.update();

    const pointlight = new PointLight(0xffffff, 999);
    pointlight.position.set(-8, 3, -25);
    this.gl.scene.add(pointlight);
  }

  private addModel() {
    this.gltfLoader.load(
      "/models/cloth.glb",
      (gltf: GLTF) => {
        const model = gltf.scene;
        model.position.set(0, -7, 0);
        model.scale.set(10, 10, 10);
        model.rotation.y = -Math.PI / 2;
        model.traverse((child) => {
          if ((child as Mesh).isMesh) {
            const mesh = child as Mesh;
    //         mesh.material = new MeshPhysicalMaterial({
    //             color: new Color(0xF5F5F5), // Neutral white-gray tint (matches image's milky tone)
    // metalness: 0.0, // Non-metallic plastic
    // roughness: 0.9, // Ultra-glossy for shiny folds
    // transmission: 0.9, // High light transmission (see-through effect)
    // thickness: 0.5, // "Depth" for refraction (tune for fold distortion)
    // ior: 1.45, // Index of refraction (plastic-like bending of light)
    // specularIntensity: 0.6,
    // specularColor: new Color(0xff0000),
    // // opacity: 0.6, // Semi-opaque to soften bike underneath (0.4-0.7)
    // transparent: true, // Enable alpha blending
    // side: DoubleSide,
    //         });
          }
            })
        this.gl.scene.add(gltf.scene);

        const clip = gltf.animations.find((anim) => anim.name === "Key.001Action.001");
        if (!clip) {
          console.warn(
            'Animation "Key.001Action.001" not found! Available clips:',
            gltf.animations.map((a) => a.name)
          );
          return;
        }

        this.animationClip = clip;
        console.log("Loaded animation clip:", clip);

        this.mixer = new AnimationMixer(gltf.scene);
        const action = this.mixer.clipAction(clip);
        action.setLoop(LoopOnce, 1); // For scrubbing
        // action.clampWhenFinished = true
        action.play(); // Play but we'll override time for scrubbing
        // action.pause(); // Uncomment to fully manual

        console.log("Model loaded and ready for scroll scrubbing.");
      }
    );
  }

  private addBike() {
    // Unchanged - your material overrides are solid
    this.gltfLoader.load(
      "/models/bike.glb",
      (gltf: GLTF) => {
        const model = gltf.scene;
        model.position.set(0, -7, 0);
        model.scale.set(10, 10, 10);
        model.rotation.y = -Math.PI / 2;
        model.traverse((child) => {
          if ((child as Mesh).isMesh) {
            const mesh = child as Mesh;
            if (mesh.name === "red_metal" || mesh.name === "bike") {
              mesh.material = new MeshPhysicalMaterial({
                color: new Color(0xffffff),
                metalness: 0.9, // High for metallic reflection (0.8-1.0)
                roughness: 0.2, // Low for semi-gloss shine (0.1-0.3; higher = matte)
                clearcoat: 0.5, // Optional: Adds a protective lacquer layer for extra depth
                clearcoatRoughness: 0.1
              });
            }
            // ... (rest of your materials unchanged)
            if (mesh.name === "black_metal") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0x000000),
                metalness: 1,
                roughness: 0.2
              });
            }
            if (mesh.name === "engine") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0x555555),
                metalness: 1,
                roughness: 0.2
              });
            }
            if (mesh.name === "white_metal") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0xaaaaaa),
                metalness: 1,
                roughness: 0.1
              });
            }
            if (mesh.name === "tyre") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0x333333),
                metalness: 0.8,
                roughness: 0.4
              });
            }
            if (mesh.name === "seat") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0x111111),
                metalness: 0.5,
                roughness: 0.7
              });
            }
            if (mesh.name === "white_lights") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0xffffff),
                metalness: 0.3,
                roughness: 0.2,
                emissive: new Color(0xffffff),
                emissiveIntensity: 5
              });
            }
            if (mesh.name === "yellow_lights") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0xffff00),
                metalness: 0.3,
                roughness: 0.2,
                emissive: new Color(0xffff00),
                emissiveIntensity: 5
              });
            }
            if (mesh.name === "red_lights") {
              mesh.material = new MeshStandardMaterial({
                color: new Color(0xff0000),
                metalness: 0.3,
                roughness: 0.2,
                emissive: new Color(0xff0000),
                emissiveIntensity: 5
              });
            }
          }
        });
        this.gl.scene.add(gltf.scene);
        console.log("Bike loaded with custom materials.");
      }
    );
  }

  private addFloor() {
    const geometry = new PlaneGeometry(1000, 1000);
    const material = new MeshStandardMaterial({ color: 0x222222, side: 2 });
    const plane = new Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, -7, 0);
    const plategeo = new CircleGeometry(12, 128);
    const platemat = new MeshStandardMaterial({ color: 0x444444, metalness: 1, roughness: 0.5, side: DoubleSide });
    const plate = new ReflectorMat(plategeo, this.options);
    plate.initialize(this.gl.renderer, this.gl.scene, this.gl.camera);

    plate.position.set(0, -6.99, 0);
    plate.rotation.x = -Math.PI / 2;
    this.gl.scene.add(plate);
    this.gl.scene.add(plane);
  }

  private addEnvironment() {
    const envMaps = [
      "/textures/env/env-2k.hdr",
      // ... your array unchanged
    ];
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(envMaps[0], (environmentMap) => {
      environmentMap.mapping = EquirectangularReflectionMapping;
      this.gl.scene.environment = environmentMap;
      this.gl.scene.environmentIntensity = 0.5;
      this.gl.scene.environment.rotation =  3;
    //   this.gl.scene.background = environmentMap;
    });
  }

  private addLights(){
    this.gltfLoader.load(
      "/models/lights.glb",
      (gltf: GLTF) => {
        const model = gltf.scene;
        model.position.set(0, 7, -15);
        model.scale.set(10, 3, 1);
        // model.rotation.y = Math.PI / 2;
        this.gl.scene.add(gltf.scene);
      }
    );
  }

public update() {
  this.gl.useFrame(() => {
   const delta = this.gl.delta;

    // Smooth lerp (increased to 1.2 for faster scroll response; tune as needed)
    this.scrollY = MathUtils.lerp(this.scrollY, this.targetScrollY, delta * 1.2);

    // Normalized progress
    const progress = this.maxScroll > 0 ? Math.max(0, Math.min(1, -this.scrollY / this.maxScroll)) : 0;

    // Scrub animation with speed multiplier (e.g., 1.5 = 50% faster)
    if (this.mixer && this.animationClip && progress > 0.5) {
      const duration = this.animationClip.duration;
      const spedUpTime = ((progress - 0.5 ) * 2) % duration; // % for looping if needed
      this.mixer.setTime(spedUpTime);
      this.mixer.update(0);
    }

    // Camera movement (descend on scroll) - unchanged
   if (progress < 0.5) {
    this.gl.camera.position.y = 30 - ((progress * 2) * 35);
    this.gl.camera.position.z = ((progress * 2) * 30);
    this.gl.camera.lookAt(0, 0, 0);
   }

    console.log(`Scroll Y: ${this.scrollY.toFixed(0)}, Progress: ${progress.toFixed(2)}`); // Debug
  });
}


  // Optional: Cleanup on destroy
  public destroy() {
    this.vs.destroy();
  }
}