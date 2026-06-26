export enum ToolMode {
    DRAG = 'drag',
    CUT = 'cut'
}

export interface UIState {
    selectedModel: string | null;
    uploadedFile: File | null;
    currentMode: ToolMode;
}