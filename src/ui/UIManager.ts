import { GeometrySlicer } from '@/components/GeometrySlicer/GeometrySlicer';
import { ToolMode } from './UIState';
import { CutManager } from '@/components/GeometrySlicer/CutManager';

export class UIManager {
	private slicer: GeometrySlicer;
    private cutManager: CutManager;

	private selectedModel: string | null = null;
	private uploadedFile: File | null = null;

	constructor(slicer: GeometrySlicer, cutManager: CutManager) {
		this.slicer = slicer;
        this.cutManager = cutManager;
		this.initMenu();
		this.initToolbar();
	}

	private initMenu() {
		const cards = document.querySelectorAll('.model-card');
		const startBtn = document.querySelector('.start-button')!;

		const fileInput = document.querySelector('.import-model input') as HTMLInputElement;
		const fileInputSwitch = document.querySelector('#model-upload-switch') as HTMLInputElement;
		const modelSwitch = document.querySelector('.model-switch') as HTMLSelectElement;
		const dropzone = document.querySelector('.dropzone') as HTMLElement;

		const uploadTitle = document.querySelector('.upload-title')!;

		const uploadSubtitle = document.querySelector('.upload-subtitle')!;

		cards.forEach((card, index) => {
			card.addEventListener('click', () => {
				cards.forEach((c) => c.classList.remove('active'));

				card.classList.add('active');

				this.selectedModel = `model-${index}`;
				modelSwitch.value = this.selectedModel;
				this.uploadedFile = null;

				uploadTitle.textContent = 'Drag & Drop GLTF/GLB';
				uploadSubtitle.textContent = 'or click to browse';

				this.updateStartButton();
			});
		});

		modelSwitch.addEventListener('change', (e) => {
			const target = e.target as HTMLSelectElement;
			this.selectedModel = target.value;
			modelSwitch.value = this.selectedModel;
			this.uploadedFile = null;
			this.slicer.clear();
			this.slicer.loadDefaultModel(this.selectedModel);
		});

		dropzone.addEventListener('dragover', (e) => {
			e.preventDefault();
			dropzone.classList.add('drag-over');
		});

		dropzone.addEventListener('dragleave', () => {
			dropzone.classList.remove('drag-over');
		});

		dropzone.addEventListener('drop', (e) => {
			e.preventDefault();

			const file = e.dataTransfer?.files[0];

			if (!file) return;

			this.uploadedFile = file;
			this.selectedModel = null;

			cards.forEach((c) => c.classList.remove('active'));

			uploadTitle.textContent = file.name;
			uploadSubtitle.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

			this.updateStartButton();
		});

		fileInput.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;

			if (!target.files?.length) return;

			const file = target.files[0];

			this.uploadedFile = file;
			this.selectedModel = null;

			cards.forEach((c) => c.classList.remove('active'));

			uploadTitle.textContent = file.name;
			uploadSubtitle.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

			this.updateStartButton();
		});

		fileInputSwitch.addEventListener('change', (e) => {
			this.slicer.clear();
			const target = e.target as HTMLInputElement;

			if (!target.files?.length) return;

			const file = target.files[0];
			modelSwitch.value = '';
			this.slicer.loadUploadedModel(file);

		});

		startBtn.addEventListener('click', () => {
			if (this.uploadedFile) {
				this.slicer.loadUploadedModel(this.uploadedFile);
			} else if (this.selectedModel) {
				this.slicer.loadDefaultModel(this.selectedModel);
			}

			document.querySelector('.menu-overlay')?.classList.add('hidden');
		});
	}

	private updateStartButton() {
		const startBtn = document.querySelector('.start-button') as HTMLButtonElement;

		startBtn.disabled = !this.selectedModel && !this.uploadedFile;
	}

	private initToolbar() {
		const dragBtn = document.querySelector('.drag-btn') as HTMLButtonElement;

		const cutBtn = document.querySelector('.cut-btn') as HTMLButtonElement;

		const resetBtn = document.querySelector('.reset-btn') as HTMLButtonElement;

        const canvas = document.querySelector('.ui-overlay') as HTMLCanvasElement;

		dragBtn.addEventListener('click', () => {
			dragBtn.classList.add('active');
			cutBtn.classList.remove('active');

            canvas.style.cursor = 'grab';

			this.cutManager.setMode(ToolMode.DRAG);
		});

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Alt' && !cutBtn.classList.contains('active')) {
                cutBtn.classList.add('active');
                dragBtn.classList.remove('active');

                this.cutManager.setMode(ToolMode.CUT);
            }
        })

        document.addEventListener('keyup', (event) => {
            if (event.key === 'Alt' ) {
                cutBtn.classList.remove('active');
                dragBtn.classList.add('active');

                this.cutManager.setMode(ToolMode.DRAG);
            }
        })

		cutBtn.addEventListener('click', () => {
			cutBtn.classList.add('active');
			dragBtn.classList.remove('active');

			this.cutManager.setMode(ToolMode.CUT);
		});

		resetBtn.addEventListener('click', () => {
			this.slicer.reset();
		});
	}
}
