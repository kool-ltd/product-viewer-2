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
