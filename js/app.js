import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class App {
    constructor() {
        this.loadedModels = new Map();
        this.draggableObjects = [];
        this.isARMode = false;
        this.placementMode = true;
        this.controller = null;
        this.raycaster = new THREE.Raycaster();
        this.intersectionPoint = new THREE.Vector3();
        this.planeNormal = new THREE.Vector3(0, 1, 0);
        this.plane = new THREE.Plane(this.planeNormal);
        this.selectedObject = null;
        this.grabbing = false;
        this.initialGrabPoint = new THREE.Vector3();
        this.initialObjectPosition = new THREE.Vector3();

        this.init();
        this.setupScene();
        this.setupLights();
        this.setupInitialControls();
        this.setupFileUpload();
        this.setupARButton();
        this.animate();
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    init() {
        this.container = document.getElementById('scene-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 3);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Setup VR controller
        this.controller = this.renderer.xr.getController(0);
        this.controller.addEventListener('select', this.onSelect.bind(this));
        this.scene.add(this.controller);

        // Create placement indicator
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.placementIndicator = new THREE.Mesh(geometry, material);
        this.placementIndicator.rotation.x = -Math.PI / 2;
        this.placementIndicator.visible = false;
        this.scene.add(this.placementIndicator);

        // Add VR Button
        document.body.appendChild(VRButton.createButton(this.renderer));

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.setupGrabbing();
    }

    setupGrabbing() {
        this.controller.addEventListener('selectstart', () => {
            if (!this.placementMode) {
                const controllerPosition = new THREE.Vector3().setFromMatrixPosition(this.controller.matrixWorld);
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.controller.quaternion);
                this.raycaster.set(controllerPosition, direction);

                const intersects = this.raycaster.intersectObjects(this.draggableObjects, true);
                if (intersects.length > 0) {
                    this.grabbing = true;
                    this.selectedObject = this.findTopLevelObject(intersects[0].object);
                    this.initialGrabPoint.copy(controllerPosition);
                    this.initialObjectPosition.copy(this.selectedObject.position);
                }
            }
        });

        this.controller.addEventListener('selectend', () => {
            this.grabbing = false;
            this.selectedObject = null;
        });
    }

    findTopLevelObject(object) {
        while (object.parent && object.parent !== this.scene) {
            object = object.parent;
        }
        return object;
    }

    onSelect() {
        if (this.placementMode) {
            this.placementMode = false;
            this.placementIndicator.visible = false;
            // Make all models visible at the placement position
            this.draggableObjects.forEach(object => {
                object.visible = true;
                object.position.copy(this.placementIndicator.position);
                // Ensure 1:1 scale
                object.scale.setScalar(1);
            });
        }
    }

    setupScene() {
        this.scene.background = new THREE.Color(0xcccccc);

        const rgbeLoader = new RGBELoader();
        rgbeLoader.load('https://raw.githubusercontent.com/kool-ltd/product-viewer/main/assets/brown_photostudio_02_4k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
            
            this.renderer.physicallyCorrectLights = true;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 0.7;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        });
    }

    setupARButton() {
        if ('xr' in navigator) {
            const arButton = ARButton.createButton(this.renderer, {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });
            document.body.appendChild(arButton);

            this.renderer.xr.addEventListener('sessionstart', () => {
                this.isARMode = true;
                this.scene.background = null;
            });

            this.renderer.xr.addEventListener('sessionend', () => {
                this.isARMode = false;
                this.scene.background = new THREE.Color(0xcccccc);
            });
        }
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }

    setupInitialControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;

        this.dragControls = new DragControls(this.draggableObjects, this.camera, this.renderer.domElement);
        this.setupControlsEventListeners();
    }

    setupControlsEventListeners() {
        this.dragControls.addEventListener('dragstart', () => {
            this.orbitControls.enabled = false;
        });

        this.dragControls.addEventListener('dragend', () => {
            this.orbitControls.enabled = true;
        });
    }

    setupFileUpload() {
        const uploadContainer = document.createElement('div');
        uploadContainer.style.position = 'fixed';
        uploadContainer.style.top = '10px';
        uploadContainer.style.left = '10px';
        uploadContainer.style.zIndex = '1000';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.glb,.gltf';
        fileInput.style.display = 'none';
        fileInput.multiple = true;

        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Upload Model';
        uploadButton.style.padding = '10px';
        uploadButton.style.cursor = 'pointer';
        uploadButton.onclick = () => fileInput.click();

        fileInput.onchange = (event) => {
            this.clearExistingModels();
            
            const files = event.target.files;
            for (let file of files) {
                const url = URL.createObjectURL(file);
                const name = file.name.replace('.glb', '').replace('.gltf', '');
                this.loadModel(url, name);
            }
        };

        uploadContainer.appendChild(uploadButton);
        uploadContainer.appendChild(fileInput);
        document.body.appendChild(uploadContainer);
    }

    clearExistingModels() {
        this.loadedModels.forEach(model => {
            this.scene.remove(model);
        });
        
        this.loadedModels.clear();
        this.draggableObjects.length = 0;
        
        this.updateDragControls();
    }

    loadModel(url, name) {
        const loader = new GLTFLoader();
        loader.load(
            url, 
            (gltf) => {
                const model = gltf.scene;
                model.userData.isDraggable = true;
                
                // Initially hide the model until placed in VR
                if (this.renderer.xr.isPresenting) {
                    model.visible = false;
                }
                
                this.draggableObjects.push(model);
                this.scene.add(model);
                this.loadedModels.set(name, model);
                
                this.updateDragControls();

                if (!this.renderer.xr.isPresenting) {
                    this.fitCameraToScene();
                }
            },
            (xhr) => {
                console.log(`${name} ${(xhr.loaded / xhr.total * 100)}% loaded`);
            },
            (error) => {
                console.error(`Error loading model ${name}:`, error);
            }
        );
    }

    updateDragControls() {
        const draggableObjects = Array.from(this.loadedModels.values());
        
        if (this.dragControls) {
            this.dragControls.dispose();
        }

        this.dragControls = new DragControls(draggableObjects, this.camera, this.renderer.domElement);
        this.setupControlsEventListeners();
    }

    fitCameraToScene() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.tan(fov / 2));

        cameraZ *= 1.5;

        this.camera.position.set(0, 0, cameraZ);
        this.orbitControls.target.copy(center);
        this.camera.updateProjectionMatrix();
        this.orbitControls.update();
    }

    updatePlacementIndicator() {
        if (!this.placementMode || !this.renderer.xr.isPresenting) return;

        const controllerPosition = new THREE.Vector3().setFromMatrixPosition(this.controller.matrixWorld);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.controller.quaternion);
        this.raycaster.set(controllerPosition, direction);

        if (this.raycaster.ray.intersectPlane(this.plane, this.intersectionPoint)) {
            this.placementIndicator.position.copy(this.intersectionPoint);
            this.placementIndicator.visible = true;
        }
    }

    updateGrabbing() {
        if (this.grabbing && this.selectedObject) {
            const controllerPosition = new THREE.Vector3().setFromMatrixPosition(this.controller.matrixWorld);
            const delta = new THREE.Vector3().subVectors(controllerPosition, this.initialGrabPoint);
            this.selectedObject.position.copy(this.initialObjectPosition).add(delta);
        }
    }

    loadDefaultModels() {
        const models = [
            { url: './assets/kool-mandoline-blade.glb', name: 'blade' },
            { url: './assets/kool-mandoline-frame.glb', name: 'frame' },
            { url: './assets/kool-mandoline-handguard.glb', name: 'handguard' },
            { url: './assets/kool-mandoline-handletpe.glb', name: 'handle' }
        ];

        models.forEach(model => {
            this.loadModel(model.url, model.name);
        });
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            if (this.renderer.xr.isPresenting) {
                this.updatePlacementIndicator();
                this.updateGrabbing();
                this.renderer.render(this.scene, this.camera);
            } else {
                this.orbitControls.update();
                this.renderer.render(this.scene, this.camera);
            }
        });
    }
}

const app = new App();
app.loadDefaultModels();

export default app;
