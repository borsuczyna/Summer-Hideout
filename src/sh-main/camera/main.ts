import { Element, EventNames, MTASAObject, Ped, Player, addEventHandler, createObject, destroyElement, dxDrawLine3D, getCursorPosition, getElementBonePosition, getElementMatrix, getElementRotation, getKeyState, getPedOccupiedVehicle, getTickCount, guiGetScreenSize, interpolateBetween, isCursorShowing, localPlayer, removeEventHandler, resourceRoot, root, setCameraMatrix, setCursorPosition, setElementAlpha, setElementPosition, setElementRotation, showCursor } from "mtasa-lua-types/client/mtasa";
import { getPositionFromElementOffset } from "../utils/elementOffset";
import { clamp } from "../utils/clamp";
import { game } from "../main";
import { angleLerp } from "../utils/angleLerp";
import { Session, addSessionDataHandler, removeSessionDataHandler, sessionPacketInterpolate } from "../session/client";
import { SyncPlayer } from "../session/shared";
import { rotate } from "../utils/rotate";

let [sx, sy] = guiGetScreenSize();

export class Camera {
    private lookObject: MTASAObject = createObject(1337, 0, 0, 0);
    player: Player;

    roll: number = 0;
    yaw: number = 0;
    pitch: number = 0;
    fov: number = 90;

    private lastAngles: [number, number, number] = [0, 0, 0];

    private onVehicleEnterEvent: (this: void, ...args: any[]) => void;
    private onVehicleExitEvent: (this: void, ...args: any[]) => void;
    private playerQuitEvent: (this: void, ...args: any[]) => void;
    private onCameraUpdateEvent: (this: void, ...args: any[]) => void;
    private syncSendEvent?: (this: void, ...args: any[]) => void;
    private syncReceiveEvent?: (this: void, ...args: any[]) => void;

    vehicleYaw: number = 0;
    get forcedVehicleYaw() {
        let vehicle = getPedOccupiedVehicle(this.player);
        let vehicleYaw = vehicle ? getElementRotation(vehicle)[2] : 0;
        return vehicleYaw;
    }

    constructor(player: Player = localPlayer, roll: number = 0, yaw: number = 0, pitch: number = 0) {
        this.player = player;
        this.roll = roll;
        this.yaw = yaw;
        this.pitch = pitch;

        this.lookObject.setCollisionsEnabled(false);
        this.lookObject.alpha = 0;

        this.onVehicleEnterEvent = (vehicle) => this.onVehicleEnter(vehicle);
        this.onVehicleExitEvent = (vehicle) => this.onVehicleExit(vehicle);
        this.playerQuitEvent = (player: Player) => this.playerQuit(player);
        this.onCameraUpdateEvent = (dt) => this.onCameraUpdate(dt);

        addEventHandler(EventNames.OnClientPlayerVehicleEnter, this.player, this.onVehicleEnterEvent);
        addEventHandler(EventNames.OnClientPlayerVehicleExit, this.player, this.onVehicleExitEvent);
        addEventHandler(EventNames.OnClientPreRender, root, this.onCameraUpdateEvent)
        addEventHandler('session:playerQuit', resourceRoot, this.playerQuitEvent);
        
        if(this.player == localPlayer) {
            showCursor(true, false);

            this.syncSendEvent = () => this.syncSend();
            addEventHandler('session:tickUpdate', resourceRoot, this.syncSendEvent);
        } else {
            this.syncReceiveEvent = (key, value, player) => this.syncReceive(key, value, player);
            print(`sync receive for ${this.player.name}}`)
            addSessionDataHandler('camera', this.syncReceiveEvent, player as unknown as SyncPlayer);
        }
    }

    destroy() {
        removeEventHandler(EventNames.OnClientPlayerVehicleEnter, this.player, this.onVehicleEnterEvent);
        removeEventHandler(EventNames.OnClientPlayerVehicleExit, this.player, this.onVehicleExitEvent);
        removeEventHandler(EventNames.OnClientPreRender, root, this.onCameraUpdateEvent);
        removeEventHandler('session:playerQuit', resourceRoot, this.playerQuitEvent);
        destroyElement(this.lookObject);

        if(this.syncSendEvent) removeEventHandler('session:tickUpdate', resourceRoot, this.syncSendEvent);
        if(this.syncReceiveEvent) removeSessionDataHandler('camera', this.syncReceiveEvent, this.player as unknown as SyncPlayer);
    }

    playerQuit(player: Player) {
        if(player == this.player) {
            this.destroy();
            print(`destroyed camera for ${player.name} (playerQuit)`)
        }
    }

    onCameraUpdate(dt: number) {
        let [x, y, z] = this.position;
        let [lx, ly, lz] = this.rayFromCamera(3);
        dxDrawLine3D(x, y, z, lx, ly, lz, 0xFFFF0000);

        if(!game.session) return;
        let player = game.session.getPlayer(this.player);
        if(!player || !player.holdingObject) return;

        let [ox, oy, oz] = this.rayFromCamera(2);
        setElementPosition(player.holdingObject.object, ox, oy, oz);
        
        let [rx, ry, rz] = player.holdingObject.holdRotation!;
        setElementRotation(player.holdingObject.object, rx, ry, rz + this.yaw);
    }

    update(dt: number) {
        if(this.player == localPlayer) {
            let [x, y, z] = this.position;
            let [lx, ly, lz] = this.lookAt;
            setCameraMatrix(x, y, z, lx, ly, lz, this.roll, this.fov);

            // Camera movement with mouse
            if(!game.cursorShowing && isCursorShowing() && game.focused && !getKeyState('lalt')) {
                let [cx, cy] = getCursorPosition();
                let [dx, dy] = [cx - .5, cy - .5];

                this.yaw -= dx * 25 * game.settings.xSensitivity;
                this.pitch = clamp(this.pitch - dy * 25 * game.settings.ySensitivity, -89, 89);

                setCursorPosition(sx/2, sy/2);
            }

            // Set player alpha
            setElementAlpha(this.player, game.settings.visibleBody ? 255 : 0);
        }

        // Update vehicle yaw
        if(getPedOccupiedVehicle(this.player)) this.vehicleYaw = angleLerp(this.vehicleYaw, this.forcedVehicleYaw, Math.max(1 - game.settings.vehicleCameraSmoothing, .05));

        return this;
    }

    syncSend(this: Camera) {
        game.session?.sendSessionData('camera', [this.roll, this.yaw, this.pitch]);
    }

    syncReceive(key: string, value: [number, number, number], player: SyncPlayer) {
        this.lastAngles = [this.roll, this.yaw, this.pitch];

        this.roll = value[0];
        this.yaw = value[1];
        this.pitch = value[2];
    }

    onVehicleEnter(vehicle: Element) {
        this.yaw -= getElementRotation(vehicle)[2];
        this.vehicleYaw = getElementRotation(vehicle)[2];
    }

    onVehicleExit(vehicle: Element) {
        this.yaw += this.vehicleYaw;
        this.vehicleYaw = 0;
    }

    updateLookObject() {
        let [x, y, z] = this.position;
        setElementPosition(this.lookObject, x, y, z);

        if(this.player == localPlayer) {
            setElementRotation(this.lookObject, this.pitch, 0, this.yaw + this.vehicleYaw);
        } else {
            let [roll, yaw, pitch] = sessionPacketInterpolate<[number, number, number]>(this.lastAngles, [this.roll, this.yaw, this.pitch], 'Linear');
            setElementRotation(this.lookObject, pitch, 0, yaw + this.vehicleYaw);
        }
    }

    get position(): [number, number, number] {
        let x: number = 0,
            y: number = 0,
            z: number = 0;

        if(game.settings.headBobbing) {
            let [x1, y1, z1] = getElementBonePosition(this.player, 6);
            if(!x1) return getPositionFromElementOffset(this.player, 0, 0, .7);
            let [x2, y2, z2] = getElementBonePosition(this.player, 7);
            [x, y, z] = interpolateBetween(x1, y1, z1, x2, y2, z2, .5, 'Linear');
        } else {
            [x, y, z] = getPositionFromElementOffset(this.player, 0, 0, .7);
        }

        return [x, y, z];
    }

    get lookAt(): [number, number, number] {
        this.updateLookObject();        
        return getPositionFromElementOffset(this.lookObject, 0, 1, 0);
    }

    set lookAt(lookAt: [number, number, number]) {
        let [x, y, z] = this.position;
        let offX = lookAt[0] - x;
        let offY = lookAt[1] - y;
        let offZ = lookAt[2] - z;
      
        // Calculate pitch
        let distanceXY = Math.sqrt(offX * offX + offY * offY);
        let pitch = Math.atan2(offZ, distanceXY);
      
        // Calculate yaw
        let yaw = Math.atan2(offY, offX);
      
        // Convert angles to degrees
        pitch = pitch * (180 / Math.PI);
        yaw = yaw * (180 / Math.PI);
      
        this.pitch = pitch;
        this.yaw = yaw - 90 - this.vehicleYaw;
        setElementPosition(this.lookObject, x, y, z);
        setElementRotation(this.lookObject, pitch, 0, yaw);
    }

    get matrix() {
        this.updateLookObject();
        return getElementMatrix(this.lookObject);
    }

    rayFromCamera(distance: number): [number, number, number] {
        this.updateLookObject();
        return getPositionFromElementOffset(this.lookObject, 0, distance, 0);
    }

    forwardVector(): [number, number, number] {
        let matrix = this.matrix;
        return [matrix[2][1], matrix[2][2], matrix[2][3]];
    }
}