// SceneManager.js
import * as THREE from 'three';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 3);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
    }

    setEnvironmentMap(envMap) {
        this.scene.environment = envMap;
        this.scene.background = envMap;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// ProductManager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ProductManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.parts = new Map();
    }

    async loadPart(url, onProgress) {
        try {
            const gltf = await new Promise((resolve, reject) => {
                this.loader.load(
                    url,
                    resolve,
                    (xhr) => {
                        if (onProgress) {
                            onProgress((xhr.loaded / xhr.total) * 100);
                        }
                    },
                    reject
                );
            });

            const model = gltf.scene;
            const originalScale = model.scale.clone();
            model.userData.originalScale = originalScale;

            const partId = `part_${this.parts.size}`;
            this.parts.set(partId, model);

            return model;
        } catch (error) {
            console.error('Error loading part:', error);
            throw error;
        }
    }

    clearParts() {
        this.parts.forEach(part => {
            if (part.parent) {
                part.parent.remove(part);
            }
        });
        this.parts.clear();
    }

    getParts() {
        return Array.from(this.parts.values());
    }
}

// InteractionManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

export class InteractionManager {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;

        this.setupOrbitControls();
        this.setupDragControls();
    }

    setupOrbitControls() {
        this.orbitControls = new OrbitControls(this.camera, this.domElement);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
    }

    setupDragControls() {
        this.dragControls = new DragControls([], this.camera, this.domElement);
        
        this.dragControls.addEventListener('dragstart', () => {
            this.orbitControls.enabled = false;
        });

        this.dragControls.addEventListener('dragend', () => {
            this.orbitControls.enabled = true;
        });

        this.dragControls.addEventListener('drag', (event) => {
            const object = event.object;
            if (object.userData.originalScale) {
                object.scale.copy(object.userData.originalScale);
            }
        });
    }

    setDraggableObjects(objects) {
        this.dragControls.dispose();
        this.dragControls = new DragControls(objects, this.camera, this.domElement);
        this.setupDragControlsEvents();
    }

    update() {
        this.orbitControls.update();
    }
}

// LoadingManager.js
export class LoadingManager {
    constructor() {
        this.setupLoadingScreen();
        this.progress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    setupLoadingScreen() {
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.style.position = 'fixed';
        this.loadingScreen.style.top = '0';
        this.loadingScreen.style.left = '0';
        this.loadingScreen.style.width = '100%';
        this.loadingScreen.style.height = '100%';
        this.loadingScreen.style.backgroundColor = 'white';
        this.loadingScreen.style.display = 'flex';
        this.loadingScreen.style.flexDirection = 'column';
        this.loadingScreen.style.alignItems = 'center';
        this.loadingScreen.style.justifyContent = 'center';
        this.loadingScreen.style.zIndex = '1000';

        const spinner = document.createElement('div');
        spinner.style.width = '48px';
        spinner.style.height = '48px';
        spinner.style.border = '4px solid #f3f3f3';
        spinner.style.borderTop = '4px solid #3498db';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        
        const progressText = document.createElement('div');
        progressText.style.marginTop = '20px';
        progressText.id = 'loading-progress';
        progressText.textContent = 'Loading Assets: 0%';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        this.loadingScreen.appendChild(spinner);
        this.loadingScreen.appendChild(progressText);
        document.body.appendChild(this.loadingScreen);
    }

    setTotalAssets(total) {
        this.totalAssets = total;
    }

    updateProgress(increment = 1) {
        this.loadedAssets += increment;
        this.progress = (this.loadedAssets / this.totalAssets) * 100;
        
        const progressElement = document.getElementById('loading-progress');
        if (progressElement) {
            progressElement.textContent = `Loading Assets: ${Math.round(this.progress)}%`;
        }

        if (this.progress >= 100) {
            this.hideLoadingScreen();
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }
}

// main.js
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { SceneManager } from './SceneManager.js';
import { ProductManager } from './ProductManager.js';
import { InteractionManager } from './InteractionManager.js';
import { LoadingManager } from './LoadingManager.js';

class App {
    constructor() {
        this.container = document.getElementById('scene-container');
        this.loadingManager = new LoadingManager();
        this.sceneManager = new SceneManager(this.container);
        this.productManager = new ProductManager();
        this.interactionManager = new InteractionManager(
            this.sceneManager.scene,
            this.sceneManager.camera,
            this.container
        );

        // Set total assets to load (environment map + default models)
        this.loadingManager.setTotalAssets(5); // 1 env map + 4 models

        this.init();
        this.setupEventListeners();
    }

    async init() {
        try {
            // Load environment map
            const rgbeLoader = new RGBELoader();
            const envMap = await new Promise((resolve, reject) => {
                rgbeLoader.load(
                    'assets/brown_photostudio_02_4k.hdr',
                    resolve,
                    undefined,
                    reject
                );
            });
            this.sceneManager.setEnvironmentMap(envMap);
            this.loadingManager.updateProgress();

            // Load default products
            await this.loadDefaultProduct();

            // Setup XR after everything is loaded
            document.body.appendChild(VRButton.createButton(this.sceneManager.renderer));
            document.body.appendChild(ARButton.createButton(this.sceneManager.renderer));

            // Start animation loop
            this.animate();
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    async loadDefaultProduct() {
        const parts = [
            'kool-mandoline-blade.glb',
            'kool-mandoline-frame.glb',
            'kool-mandoline-handguard.glb',
            'kool-mandoline-handletpe.glb'
        ];

        for (const part of parts) {
            try {
                const model = await this.productManager.loadPart(
                    `assets/${part}`,
                    (progress) => {
                        // Update loading progress
                        console.log(`Loading ${part}: ${progress}%`);
                    }
                );
                this.sceneManager.scene.add(model);
                this.loadingManager.updateProgress();
            } catch (error) {
                console.error(`Error loading ${part}:`, error);
            }
        }

        // Update drag controls with loaded parts
        const parts = this.productManager.getParts();
        this.interactionManager.setDraggableObjects(parts);
    }

    setupEventListeners() {
        const fileInput = document.getElementById('part-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event.target.files);
            });
        }

        window.addEventListener('resize', () => {
            this.sceneManager.onWindowResize();
        });
    }

    async handleFileUpload(files) {
        this.productManager.clearParts();
        
        this.loadingManager.setTotalAssets(files.length);
        for (const file of files) {
            const url = URL.createObjectURL(file);
            try {
                await this.productManager.loadPart(url);
                this.loadingManager.updateProgress();
            } catch (error) {
                console.error('Error loading uploaded file:', error);
            }
            URL.revokeObjectURL(url);
        }
    }

    animate() {
        this.sceneManager.renderer.setAnimationLoop(() => {
            this.interactionManager.update();
            this.sceneManager.render();
        });
    }
}

// Start the application
new App();
