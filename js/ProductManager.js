import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ProductManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.parts = new Map();
        this.placed = false;
    }

    async loadPart(url) {
        try {
            const gltf = await this.loader.loadAsync(url);
            const model = gltf.scene;
            model.visible = false; // Start hidden
            
            const originalScale = model.scale.clone();
            model.userData.originalScale = originalScale;
            
            const partId = `part_${this.parts.size}`;
            this.parts.set(partId, model);
            
            return model;
        } catch (error) {
            console.error('Error loading part:', error);
        }
    }

    setPlaced(placed) {
        this.placed = placed;
        this.parts.forEach(part => part.visible = placed);
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
