import { game } from "../main";
import { Settings } from "./settings";

export interface SaveData {
    cursorShowing: boolean;

    settings: Settings;

    camera: {
        lookAt: [number, number, number];
    }
};

export function getSaveData(): SaveData {
    return {
        cursorShowing: game.cursorShowing,
        settings: game.settings,
        camera: {
            lookAt: game.camera.lookAt
        }
    };
}

export function loadSaveData(data: SaveData) {
    game.cursorShowing = data.cursorShowing;
    game.settings = data.settings;
    
    game.camera.lookAt = data.camera.lookAt;
}