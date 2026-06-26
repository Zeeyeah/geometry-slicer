# Geometry Slicer

Interactive 3D mesh slicing built with **Three.js**. Load a GLB/GLTF model, draw a cut line on screen, and split the mesh along the derived cutting plane.

## Framework / Approach

| Layer | Choice |
|-------|--------|
| **3D rendering** | [Three.js](https://threejs.org/) (r179) — not Babylon.js or raw WebGL2 |
| **Language** | TypeScript |
| **Bundler** | Vite |
| **Model loading** | `GLTFLoader` via a shared `LoadingHandler` |
| **Input & tools** | `CutManager` handles mouse events, raycasting, and tool modes (drag / cut) |
| **Geometry pipeline** | Custom CPU-side mesh splitting (`GeometryReader` → `TriangleSplitter` → `GeometryBuilder`) |

The app uses a singleton `Gl` wrapper around the Three.js renderer, scene, and camera. UI is plain DOM (`UIManager`) wired directly to `GeometrySlicer` (load/reset) and `CutManager` (tool mode).

## Geometry Slicing Approach

### 1. Deriving the cutting plane

When the user drags in **Cut** mode, `CutManager` converts the 2D screen line into a `THREE.Plane`:

1. **Screen → world** — Start and end pixel positions are raycast into the scene (`screenToWorld`). If nothing is hit, a fixed fallback plane at `z = -5` is used.
2. **Drag direction** — `endWorldPos - startWorldPos`, normalized.
3. **Plane normal** — `cross(dragDirection, cameraForward)`. If the drag is nearly parallel to the view (degenerate cross product), the camera's X basis vector is used instead.
4. **Plane position** — The plane passes through the midpoint of the two world points: `plane.setFromNormalAndCoplanarPoint(normal, midpoint)`.

A red `PlaneHelper` is shown during the drag as a live preview.

### 2. Classifying vertices

`MeshCutter.cut()` runs the geometry through three stages:

**Read** (`GeometryReader`) — Buffer geometry is walked triangle-by-triangle (indexed or non-indexed). Each vertex is copied with position, normal, and UV, then transformed into **world space** via the mesh's `matrixWorld`.

**Split** (`TriangleSplitter`) — For each triangle, each vertex is classified using signed distance to the plane (`plane.distanceToPoint`):

- `d >= 0` → front (positive) side
- `d <= 0` → back (negative) side

Vertices on the plane (`d === 0`) are added to **both** sides. When an edge crosses the plane (`d0` and `d1` have opposite signs), an intersection vertex is computed by linear interpolation (`t = da / (da - db)`) and appended to both the front and back polygons. Each resulting polygon is fan-triangulated into new triangles.

**Build** (`GeometryBuilder`) — Front and back face lists are written into new `BufferGeometry` instances and wrapped in `THREE.Mesh` objects using the original material.

### 3. Cap generation

There is **no dedicated cap-generation step**. The splitter only clips existing triangles; it does not collect intersection edges into closed contours and triangulate new cap faces to seal the cut.

What you get instead are the boundary triangles created when straddling triangles are clipped — their cut edges lie on the plane, but this does not guarantee a watertight seal for complex meshes or multi-loop cuts. Proper caps (2D contour extraction + triangulation on the cut plane) are not implemented yet.

After cutting, the two pieces are nudged apart slightly along the plane normal (`separatePieces`, 0.01 units) for visual clarity.

## Project Structure

```
src/
├── components/GeometrySlicer/
│   ├── CutManager.ts       # Input, plane preview, cut orchestration
│   ├── MeshCutter.ts       # Pipeline entry point
│   ├── GeometrySlicer.ts   # Model load / reset
│   └── utlis/
│       ├── GeometryReader.ts
│       ├── TriangleSplitter.ts
│       └── GeometryBuilder.ts
├── ui/UIManager.ts         # Menu, toolbar, tool mode buttons
└── main.ts                 # App bootstrap
```

## Getting Started

```bash
npm install
npm run dev
```

## Known Issues / Incomplete Areas

### `findMeshToCut` only targets a single arbitrary mesh

`CutManager.findMeshToCut()` walks the scene with `scene.traverse()` and returns the **first** `THREE.Mesh` it encounters, then stops. Traversal order follows the scene graph (parent → children, depth-first), which is effectively arbitrary from the user's perspective.

Consequences:

- **Multi-mesh models** (common in GLTF exports) — only one sub-mesh is ever cut; the rest are ignored.
- **After a previous cut** — front/back pieces remain in the scene, so the "first" mesh may be a cut fragment rather than the original model.
- **No user targeting** — there is no raycast-to-select or hover-to-target; you cannot choose which mesh to cut.

### Cut plane preview needs improvement

The live preview has several limitations:

- Uses a fixed-size `PlaneHelper(plane, 8, …)` that does not scale to the model's bounding box.
- `screenToWorld` converts screen coordinates using `window.innerWidth/Height` instead of the canvas bounding rect, so the plane can misalign when the canvas does not fill the viewport.
- The helper is destroyed and recreated on every mouse-move during a drag, which is inefficient and can flicker.
- The preview plane does not snap to or align with mesh surfaces — it is purely derived from screen drag + camera orientation.
- No visual feedback for invalid cuts (drag too short, missed geometry, degenerate plane).

### Other gaps

- **Reset vs. cut state** — `GeometrySlicer.reset()` restores the backup model but does not call `CutManager.undoLastCut()`, so cut-piece state can drift from what is on screen.
- **Single cut depth** — only the most recent front/back pieces are tracked; chained cuts on already-cut geometry are not fully managed.
- **No cap meshes** — cut surfaces may show open edges (see [Cap generation](#3-cap-generation) above).
- **Architecture** — `GeometrySlicer` and `CutManager` both write to the shared scene independently with no coordinator, which makes state harder to reason about as features grow.
