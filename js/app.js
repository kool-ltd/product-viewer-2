import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

class App {
    constructor() {
        this.loadedModels = new Map();
        this.draggableObjects = [];
        this.isARMode = false;
        this.placementMode = true;
        this.controllers = [];
        this.controllerGrips = [];
        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.workingVector = new THREE.Vector3();
        this.grabbing = false;
        this.selectedObject = null;
        this.initialGrabPoint = new THREE.Vector3();
        this.initialObjectPosition = new THREE.Vector3();
        
        // Rotation control properties
        this.rotationMode = false;
        this.lastControllerRotation = new THREE.Quaternion();
        this.initialObjectRotation = new THREE.Quaternion();

        // Debug line for raycaster visualization
        this.debugLine = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0xff0000 })
        );

        this.init();
        this.setupScene();
        this.setupLights();
        this.setupInitialControls();
        this.setupFileUpload();
        this.setupARButton();
        this.setupRotationIndicator();
        this.animate();
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

        // Add debug line to scene
        this.scene.add(this.debugLine);

        // Setup VR controllers
        this.setupVRControllers();

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
    }

    setupRotationIndicator() {
        const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        this.rotationIndicator = new THREE.Mesh(geometry, material);
        this.rotationIndicator.visible = false;
        this.scene.add(this.rotationIndicator);
    }
    setupVRControllers() {
        // Controller 0
        this.controller1 = this.renderer.xr.getController(0);
        this.controller1.addEventListener('selectstart', (evt) => this.onSelectStart(evt, 0));
        this.controller1.addEventListener('selectend', (evt) => this.onSelectEnd(evt, 0));
        this.controller1.addEventListener('squeezestart', () => {
            if (this.controller1.userData.selected) {
                this.rotationMode = true;
            }
        });
        this.controller1.addEventListener('squeezeend', () => {
            this.rotationMode = false;
        });
        this.scene.add(this.controller1);
        this.controllers.push(this.controller1);

        // Controller 1
        this.controller2 = this.renderer.xr.getController(1);
        this.controller2.addEventListener('selectstart', (evt) => this.onSelectStart(evt, 1));
        this.controller2.addEventListener('selectend', (evt) => this.onSelectEnd(evt, 1));
        this.controller2.addEventListener('squeezestart', () => {
            if (this.controller2.userData.selected) {
                this.rotationMode = true;
            }
        });
        this.controller2.addEventListener('squeezeend', () => {
            this.rotationMode = false;
        });
        this.scene.add(this.controller2);
        this.controllers.push(this.controller2);

        // Controller grips
        const controllerModelFactory = new XRControllerModelFactory();

        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));
        this.scene.add(this.controllerGrip1);
        this.controllerGrips.push(this.controllerGrip1);

        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));
        this.scene.add(this.controllerGrip2);
        this.controllerGrips.push(this.controllerGrip2);

        // Add targeting ray
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.scale.z = 5;

        this.controller1.add(line.clone());
        this.controller2.add(line.clone());
    }

    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }
    onSelectStart(event, controllerIndex) {
        const controller = event.target;

        if (this.placementMode) {
            this.placementMode = false;
            this.placementIndicator.visible = false;
            this.draggableObjects.forEach(object => {
                object.visible = true;
                object.position.copy(this.placementIndicator.position);
                object.scale.setScalar(1);
            });
            return;
        }

        // Get controller position and direction
        this.workingMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);

        const intersects = this.raycaster.intersectObjects(this.draggableObjects, true);
        
        if (intersects.length > 0) {
            this.grabbing = true;
            this.selectedObject = this.findTopLevelObject(intersects[0].object);
            controller.userData.selected = this.selectedObject;
            
            // Store initial positions and rotations
            controller.userData.initialPosition = this.selectedObject.position.clone();
            controller.userData.initialControllerPosition = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
            controller.userData.initialControllerRotation = new THREE.Quaternion().setFromRotationMatrix(this.workingMatrix);
            controller.userData.initialObjectRotation = this.selectedObject.quaternion.clone();
        }
    }

    onSelectEnd(event, controllerIndex) {
        const controller = event.target;

        if (controller.userData.selected) {
            this.grabbing = false;
            this.selectedObject = null;
            controller.userData.selected = undefined;
            controller.userData.initialPosition = undefined;
            controller.userData.initialControllerPosition = undefined;
            this.rotationMode = false;
        }
    }

    findTopLevelObject(object) {
        while (object.parent && object.parent !== this.scene) {
            object = object.parent;
        }
        return object;
    }

    setupInitialControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
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

    clearExistingModels() {
        this.loadedModels.forEach(model => {
            this.scene.remove(model);
        });
        
        this.loadedModels.clear();
        this.draggableObjects.length = 0;
    }

    loadModel(url, name) {
        const loader = new GLTFLoader();
        loader.load(
            url, 
            (gltf) => {
                const model = gltf.scene;
                model.userData.isDraggable = true;
                model.matrixAutoUpdate = true;
                
                if (this.renderer.xr.isPresenting) {
                    model.visible = false;
                }
                
                this.draggableObjects.push(model);
                this.scene.add(model);
                this.loadedModels.set(name, model);
                
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

    updateXRInteraction() {
        this.controllers.forEach((controller) => {
            if (controller.userData.selected) {
                const selectedObject = controller.userData.selected;
                
                // Get current controller position and rotation
                const currentPosition = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
                this.workingMatrix.identity().extractRotation(controller.matrixWorld);
                const currentRotation = new THREE.Quaternion().setFromRotationMatrix(this.workingMatrix);

                // Update position
                const deltaPosition = new THREE.Vector3();
                deltaPosition.subVectors(currentPosition, controller.userData.initialControllerPosition);
                selectedObject.position.copy(controller.userData.initialPosition).add(deltaPosition);

                // Update rotation
                const rotationDelta = new THREE.Quaternion()
                    .copy(controller.userData.initialControllerRotation)
                    .invert()
                    .multiply(currentRotation);
                
                selectedObject.quaternion.copy(controller.userData.initialObjectRotation)
                    .multiply(rotationDelta);
            }
        });
    }
    updatePlacementIndicator() {
        if (!this.placementMode || !this.renderer.xr.isPresenting) return;

        const controller = this.controllers[0];
        if (!controller) return;

        this.workingMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
        const intersectionPoint = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, intersectionPoint)) {
            this.placementIndicator.position.copy(intersectionPoint);
            this.placementIndicator.visible = true;
        }
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

    animate() {
        this.renderer.setAnimationLoop(() => {
            if (this.renderer.xr.isPresenting) {
                if (this.placementMode) {
                    this.updatePlacementIndicator();
                } else {
                    this.updateXRInteraction();
                }
            } else {
                this.orbitControls.update();
            }
            this.renderer.render(this.scene, this.camera);
        });
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
}

const app = new App();
app.loadDefaultModels();

export default app;
