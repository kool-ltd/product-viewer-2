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
