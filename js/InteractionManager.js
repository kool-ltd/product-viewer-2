import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DragControls } from 'three/addons/controls/DragControls.js';

export class InteractionManager {
    constructor(scene, camera, domElement, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.renderer = renderer;
        this.xrObjects = [];
        this.selectedXRObject = null;

        this.setupOrbitControls();
        this.setupDragControls();
        this.setupXRInteractions();
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
    }

    setupXRInteractions() {
        this.controller = this.renderer.xr.getController(0);
        this.scene.add(this.controller);
        
        this.controller.addEventListener('selectstart', () => this.onXRSelectStart());
        this.controller.addEventListener('selectend', () => this.onXRSelectEnd());
        this.controller.addEventListener('connected', (event) => {
            this.controller.gamepad = event.data.gamepad;
        });
    }

    onXRSelectStart() {
        if (!this.renderer.xr.isPresenting) return;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromController(this.controller);
        
        const intersects = raycaster.intersectObjects(this.xrObjects);
        if (intersects.length > 0) {
            this.selectedXRObject = intersects[0].object;
            this.originalParent = this.selectedXRObject.parent;
            this.controller.attach(this.selectedXRObject);
        }
    }

    onXRSelectEnd() {
        if (this.selectedXRObject) {
            this.originalParent.attach(this.selectedXRObject);
            this.selectedXRObject = null;
        }
    }

    setXRInteractiveObjects(objects) {
        this.xrObjects = objects;
    }

    setDraggableObjects(objects) {
        this.dragControls.dispose();
        this.dragControls = new DragControls(objects, this.camera, this.domElement);
        this.setupDragControlsEvents();
    }

    update() {
        this.orbitControls.update();
        
        if (this.renderer.xr.isPresenting && this.controller?.gamepad?.axes) {
            const axes = this.controller.gamepad.axes;
            if (this.selectedXRObject && axes.length >= 4) {
                // Use right thumbstick for rotation
                const rotateSpeed = 0.05;
                this.selectedXRObject.rotation.y += axes[2] * rotateSpeed;
                this.selectedXRObject.rotation.x += axes[3] * rotateSpeed;
            }
        }
    }
}