import * as THREE from 'three';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupPlacementRing(); // Add placement ring
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

    setupPlacementRing() {
        const ringGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
        this.placementRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.placementRing.rotation.x = -Math.PI / 2; // Make it horizontal
        this.placementRing.visible = false;
        this.scene.add(this.placementRing);
    }

    updatePlacementRing(position) {
        if (this.placementRing) {
            this.placementRing.position.copy(position);
            this.placementRing.visible = true;
        }
    }

    hidePlacementRing() {
        if (this.placementRing) {
            this.placementRing.visible = false;
        }
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
