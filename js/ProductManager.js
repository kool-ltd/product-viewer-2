import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/loaders/GLTFLoader.js';

export class ProductManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.parts = new Map();
    }

    async loadPart(url) {
        try {
            const gltf = await this.loader.loadAsync(url);
            const model = gltf.scene;

            // Preserve original scale
            const originalScale = model.scale.clone();
            model.userData.originalScale = originalScale;

            // Add to parts collection
            const partId = `part_${this.parts.size}`;
            this.parts.set(partId, model);

            return model;
        } catch (error) {
            console.error('Error loading part:', error);
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
