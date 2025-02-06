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
