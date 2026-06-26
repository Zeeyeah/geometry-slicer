import GUI from "lil-gui";

export default class UseGUI{
    static instance: GUI;
    constructor(){
        if(UseGUI.instance){
            throw new Error('UseGUI instance has already been created. Call getInstance instead.');
        }
        // super();
        UseGUI.instance = new GUI();
    }
    static getInstance(): GUI{
        if (!UseGUI.instance) {
			throw new Error('UseGUI instance has not been created. Create a UseGUI instance first.');
		}
		return UseGUI.instance;
    }

	addButton(label: string, callback: () => void) {
		return UseGUI.instance.add({ [label]: callback }, label).name(label);
	}
}