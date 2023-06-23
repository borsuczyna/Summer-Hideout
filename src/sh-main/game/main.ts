import { Event, EventNames, MTASAObject, Player, addEvent, addEventHandler, createTrayNotification, getElementData, getElementPosition, getElementRotation, getTickCount, guiGetScreenSize, iprint, isMTAWindowFocused, localPlayer, processLineOfSight, removeEventHandler, resourceRoot, root, setCursorPosition, setElementPosition, toggleControl, triggerServerEvent } from "mtasa-lua-types/client/mtasa";
import { Camera } from "../camera/main";
import { Settings } from "./settings";
import { Session } from "../session/client";
import { showNotification } from "../notifications/client";
import { Settings as GlobalSettings } from "../settings/main";
import { rotate } from "../utils/rotate";
import { getPhysicsObjectRotation } from "../objects/physics";

addEvent('session:join', true);
addEvent('session:start', true);

export class Game {
    camera: Camera = new Camera();
    session?: Session;

    cursorShowing: boolean = false;
    minimized: boolean = false;

    settings: Settings = {
        headBobbing: true,
        visibleBody: false,

        xSensitivity: 2.3,
        ySensitivity: 2,

        vehicleCameraSmoothing: .8,
    };

    private onMinimizeEvent: (this: void, ...args: any[]) => void;
    private onRestoreEvent: (this: void, ...args: any[]) => void;
    private joinSessionEvent: (this: void, ...args: any[]) => void;
    private startSessionEvent: (this: void, ...args: any[]) => void;
    private onClientKeyEvent: (this: void, ...args: any[]) => void;

    constructor() {
        this.onMinimizeEvent = () => this.onMinimize();
        this.onRestoreEvent = () => this.onRestore();
        this.joinSessionEvent = (code: string, dimension: number) => this.joinSession(code, dimension);
        this.startSessionEvent = (players) => this.startSession(players);
        this.onClientKeyEvent = (key: string, state: boolean) => this.onClientKey(key, state);

        addEventHandler(EventNames.OnClientMinimize, root, this.onMinimizeEvent);
        addEventHandler(EventNames.OnClientRestore, root, this.onRestoreEvent);
        addEventHandler('session:join', resourceRoot, this.joinSessionEvent);
        addEventHandler('session:start', resourceRoot, this.startSessionEvent);
        addEventHandler(EventNames.OnClientKey, root, this.onClientKeyEvent);

        toggleControl('fire', false);
    }

    destroy() {
        removeEventHandler(EventNames.OnClientMinimize, root, this.onMinimizeEvent);
        removeEventHandler(EventNames.OnClientRestore, root, this.onRestoreEvent);
        removeEventHandler('session:join', resourceRoot, this.joinSessionEvent);
        removeEventHandler('session:start', resourceRoot, this.startSessionEvent);
        removeEventHandler(EventNames.OnClientKey, root, this.onClientKeyEvent);
    }

    update(dt: number) {
        this.camera.update(dt);
        this.session?.update(dt);

        return this;
    }

    private onMinimize() {
        createTrayNotification('You will get kicked after 5 minutes of inactivity, we have decreased your packet update rate', 'warning')
        this.minimized = true;
    }

    private onRestore() {
        this.minimized = false;

        let [sx, sy] = guiGetScreenSize();
        setCursorPosition(sx/2, sy/2);
    }

    get focused() {
        return isMTAWindowFocused();
    }

    // Session
    leaveSession() {
        if(!this.session) return;
    
        this.session = undefined;
    }

    joinSession(code: string, dimension: number) {
        this.leaveSession();
        this.session = new Session(code, dimension);
    }

    startSession(players: Player[]) {
        if(!this.session) return showNotification('Critical error, tried to start a session without it being initialised!', 'error');
        
        this.session.start();
        this.session.createPlayers(players);
        showNotification('Session started!', 'success');
    }

    onClientKey(key: string, state: boolean) {
        if(!this.session) return;

        if(key == 'mouse1' && state) {
            let player = this.session.getPlayer(localPlayer);
            if(!player) return;

            if(player.holdingObject) {
                triggerServerEvent('session:dropObject', resourceRoot, this.session.code, player.holdingObject, [0, 0, 0]);
            } else {
                let [x, y, z] = this.camera.position;
                let [lx, ly, lz] = this.camera.rayFromCamera(5);
                let [hit, hitX, hitY, hitZ, hitElement] = processLineOfSight(x, y, z, lx, ly, lz, true, true, true, true, true, false, false, false, localPlayer, false, false);
                
                if(hit && hitElement) {
                    let object = this.session.getObject(hitElement);
                    if(!object || object.beingHold) return;

                    let [rx, ry, rz] = getPhysicsObjectRotation(hitElement);
                    triggerServerEvent('session:grabObject', resourceRoot, this.session.code, object, [rx, ry, rz]);
                }
            }
        } else if(key == 'mouse2' && state) {
            let player = this.session.getPlayer(localPlayer);
            if(!player) return;

            if(player.holdingObject) {
                let velocity = this.camera.forwardVector().map(v => v * GlobalSettings.ThrowVelocity);
                triggerServerEvent('session:dropObject', resourceRoot, this.session.code, player.holdingObject, velocity);
            }
        }
    }
}