import { EasingType, Element, MTASAObject, Player, addEvent, addEventHandler, dxDrawText, engineSetModelPhysicalPropertiesGroup, getDistanceBetweenPoints3D, getElementPosition, getScreenFromWorldPosition, getTickCount, interpolateBetween, iprint, isElement, localPlayer, removeEventHandler, resourceRoot, root, setElementAngularVelocity, setElementFrozen, setElementVelocity, source, triggerEvent, triggerServerEvent } from "mtasa-lua-types/client/mtasa";
import { Settings } from "../settings/main";
import { SessionData, SessionDataCallback, SessionDataHandler, SyncPlayer } from "./shared";
import { Vector3 } from "mtasa-lua-types/shared/vector";
import { compareVector3 } from "../utils/vectorCompare";
import { doesObjectHavePhysics } from "../objects/shared";
import { Camera } from "../camera/main";
import { game } from "../main";

addEvent('session:tickUpdate', false);
addEvent('session:dataUpdate', true);
addEvent('session:dataChange', false);
addEvent('session:playerQuit', true);
addEvent('session:createObject', true);
addEvent('session:updateObject', true);
addEvent('session:setSyncer', true);
addEvent('session:grabObject', true);
addEvent('session:dropObject', true);
addEvent('object:onStreamIn', true);
addEvent('object:onStreamOut', true);

interface SessionObject {
    object: MTASAObject;
    syncer: SyncPlayer;
    lastPosition: Vector3;
    lastRotation: Vector3;
    lastVelocity: Vector3;
    lastAngularVelocity: Vector3;
    beingHold: SyncPlayer | undefined;
    holdRotation?: [number, number, number];
};

interface PlayerData {
    player: Player;
    camera: Camera;
    holdingObject?: SessionObject;
}

let sessionDataHandlers: SessionDataHandler[] = [];
let lastSyncUpdate: number = 0;

export class Session {
    code: string;
    dimension: number = 0;
    started: boolean = false;
    lastUpdate: number = 0;
    lastObjectsUpdate: number = 0;
    objects: SessionObject[] = [];
    players: PlayerData[] = [];

    private sendData: SessionData[] = [];
    private sessionData: SessionData[] = [];
    private updateDataEvent: (this: void, ...args: any[]) => void;
    private playerQuitEvent: (this: void, ...args: any[]) => void;
    private createObjectEvent: (this: void, ...args: any[]) => void;
    private updateObjectEvent: (this: void, ...args: any[]) => void;
    private setSyncerEvent: (this: void, ...args: any[]) => void;
    private grabObjectEvent: (this: void, ...args: any[]) => void;
    private dropObjectEvent: (this: void, ...args: any[]) => void;
    private elementStreamInEvent: (this: void, ...args: any[]) => void;
    private elementStreamOutEvent: (this: void, ...args: any[]) => void;

    constructor(code: string, dimension: number) {
        this.code = code;
        this.dimension = dimension;

        this.updateDataEvent = (sessionData: SessionData[]) => this.updateData(sessionData);
        this.playerQuitEvent = (player: Player) => this.playerQuit(player);
        this.createObjectEvent = (object: SessionObject) => this.createObject(object);
        this.updateObjectEvent = (object: SessionObject, position: [number, number, number], rotation: [number, number, number], velocity: [number, number, number], angularVelocity: [number, number, number]) => this.updateObject(object, position, rotation, velocity, angularVelocity);
        this.setSyncerEvent = (object: SessionObject, syncer: SyncPlayer) => this.setSyncer(object, syncer);
        this.grabObjectEvent = (object: SessionObject, rotation: [number, number, number], player: SyncPlayer) => this.grabObject(object, rotation, player);
        this.dropObjectEvent = (object: SessionObject, player: SyncPlayer, velocity: [number, number, number]) => this.dropObject(object, player, velocity);
        this.elementStreamInEvent = () => this.elementStreamIn();
        this.elementStreamOutEvent = () => this.elementStreamOut();
        addEventHandler('session:dataUpdate', resourceRoot, this.updateDataEvent);
        addEventHandler('session:playerQuit', resourceRoot, this.playerQuitEvent);
        addEventHandler('session:createObject', resourceRoot, this.createObjectEvent);
        addEventHandler('session:updateObject', resourceRoot, this.updateObjectEvent);
        addEventHandler('session:setSyncer', resourceRoot, this.setSyncerEvent);
        addEventHandler('session:grabObject', resourceRoot, this.grabObjectEvent);
        addEventHandler('session:dropObject', resourceRoot, this.dropObjectEvent);
        addEventHandler('object:onStreamIn', resourceRoot, this.elementStreamInEvent);
        addEventHandler('object:onStreamOut', resourceRoot, this.elementStreamOutEvent);

        // addEventHandler('onClientRender', root, () => this.renderDebug());
    }

    destroy() {
        removeEventHandler('session:dataUpdate', resourceRoot, this.updateDataEvent);
        removeEventHandler('session:playerQuit', resourceRoot, this.playerQuitEvent);
        removeEventHandler('session:createObject', resourceRoot, this.createObjectEvent);
        removeEventHandler('session:updateObject', resourceRoot, this.updateObjectEvent);
        removeEventHandler('session:setSyncer', resourceRoot, this.setSyncerEvent);
        removeEventHandler('session:grabObject', resourceRoot, this.grabObjectEvent);
        removeEventHandler('session:dropObject', resourceRoot, this.dropObjectEvent);
        removeEventHandler('object:onStreamIn', resourceRoot, this.elementStreamInEvent);
        removeEventHandler('object:onStreamOut', resourceRoot, this.elementStreamOutEvent);
    }

    start() {
        this.started = true;
        this.lastUpdate = getTickCount();
    }

    createPlayers(players: Player[]) {
        for(let player of players) {
            if(player != localPlayer) {
                this.players.push({
                    player,
                    camera: new Camera(player)
                });
            }
        }

        this.players.push({
            player: localPlayer,
            camera: game.camera
        })
    }

    getPlayer(player: Player) {
        return this.players.find(p => p.player == player);
    }

    playerQuit(player: Player) {
        
    }

    update(dt: number) {
        if(!this.started) return;

        let updateMs = 1000/Settings.TickCount;
        if(getTickCount() - this.lastUpdate >= updateMs) {
            this.lastUpdate = getTickCount();
            
            this.sendData = [];
            triggerEvent('session:tickUpdate', resourceRoot, this);
            if(this.sendData.length > 0) {
                triggerServerEvent('session:dataUpdate', resourceRoot, this.code, this.sendData);
            }
        }

        this.updateObjects();
    }

    getSendData(key: string, syncPlayer?: SyncPlayer) {
        return this.sendData.find(data => data.key === key && (!syncPlayer || data.syncPlayer == syncPlayer));
    }

    sendSessionData(key: string, value: any, noPlayer: boolean = false) {
        let player = (localPlayer as unknown as SyncPlayer);
        let found = this.getSendData(key, noPlayer ? undefined : player);

        if(found) found.value = value;
        else this.sendData.push({
            syncPlayer: noPlayer ? undefined : player,
            key,
            value,
            sentBy: player
        });

        this.setSessionData(key, value, player, noPlayer ? undefined : player);
    }

    getSessionData(key: string, syncPlayer?: SyncPlayer) {
        return this.sessionData.find(data => data.key === key && (!syncPlayer || data.syncPlayer == syncPlayer));
    }

    setSessionData(key: string, value: any, sentBy: SyncPlayer, syncPlayer?: SyncPlayer) {
        let existingData = this.getSessionData(key, syncPlayer);
        if(existingData) existingData.value = value;
        else this.sessionData.push({
            syncPlayer,
            key,
            value,
            sentBy: sentBy
        });

        triggerEvent('session:dataChange', resourceRoot, key, value, syncPlayer, sentBy);
    }

    updateData(sessionData: SessionData[]) {
        let me = (localPlayer as unknown as SyncPlayer);
        sessionData.forEach(data => {
            if(data.sentBy != me) this.setSessionData(data.key, data.value, data.sentBy, data.syncPlayer);
        });

        lastSyncUpdate = getTickCount();
    }

    updateObjects() {
        if(getTickCount() - this.lastObjectsUpdate < 1000/Settings.ObjectsTickCount) return;

        let me = (localPlayer as unknown as SyncPlayer);
        this.objects.forEach(object => {
            if(!doesObjectHavePhysics(object.object.model) || object.syncer != me) return;
            
            let velocity = object.object.velocity;
            let angularVelocity = object.object.angularVelocity;
            if(compareVector3(velocity, object.lastVelocity) && compareVector3(angularVelocity, object.lastAngularVelocity)) return;

            object.lastVelocity = velocity;
            object.lastAngularVelocity = angularVelocity;

            this.sendObjectUpdate(object);
        });

        // if you're not syncer of object and you're closer to it than syncer and it's in motion, request being syncer
        this.objects.forEach(object => {
            let [ox, oy, oz] = getElementPosition(object.object);
            let myDistance = getDistanceBetweenPoints3D(ox, oy, oz, me.position.x, me.position.y, me.position.z);
            let syncerDistance = getDistanceBetweenPoints3D(ox, oy, oz, object.syncer.position.x, object.syncer.position.y, object.syncer.position.z);

            let canBeNewSyncer = (
                !object.beingHold &&
                object.syncer != me &&
                myDistance < syncerDistance &&
                (
                    !compareVector3(object.object.velocity, new Vector3(0, 0, 0)) ||
                    !compareVector3(object.object.angularVelocity, new Vector3(0, 0, 0)) ||
                    !compareVector3(object.object.velocity, object.lastVelocity) ||
                    !compareVector3(object.object.angularVelocity, object.lastAngularVelocity)
                ) 
            );
            if(!canBeNewSyncer) return;
            
            print('i want to be new syncer');
            triggerServerEvent('session:requestSyncer', resourceRoot, this.code, object);
            object.syncer = me;
        });

        this.lastObjectsUpdate = getTickCount();
    }

    setSyncer(object: SessionObject, syncer: SyncPlayer) {
        object = this.objects.find(o => o.object == object.object)!;

        object.syncer = syncer;
        if(syncer == localPlayer as unknown as SyncPlayer) this.sendObjectUpdate(object);

        iprint('new syncer: ' + syncer.name, getTickCount());
    }

    grabObject(object: SessionObject, rotation: [number, number, number], grabber: SyncPlayer) {
        object = this.objects.find(o => o.object == object.object)!;

        object.beingHold = grabber;
        object.holdRotation = rotation;
        object.syncer = grabber;

        let player = this.players.find(p => p.player == grabber as unknown as Player)!;
        player.holdingObject = object;
        setElementFrozen(object.object, true);

        if(grabber == localPlayer as unknown as SyncPlayer) this.sendObjectUpdate(object);
    }

    dropObject(object: SessionObject, newSyncer: SyncPlayer, velocity: [number, number, number] = [0, 0, 0]) {
        object = this.objects.find(o => o.object == object.object)!;

        let player = this.getPlayer(object.beingHold as unknown as Player)!;
        player.holdingObject = undefined;

        object.beingHold = undefined;
        object.syncer = newSyncer;

        engineSetModelPhysicalPropertiesGroup(object.object.model, 42);
        setElementFrozen(object.object, false);

        setElementVelocity(object.object, velocity[0], velocity[1], velocity[2]-.02);

        if(newSyncer == localPlayer as unknown as SyncPlayer) this.sendObjectUpdate(object);
    }

    sendObjectUpdate(object: SessionObject) {
        let lastPosition = [object.object.position.x, object.object.position.y, object.object.position.z];
        let lastRotation = [object.object.rotation.x, object.object.rotation.y, object.object.rotation.z];
        let lastVelocity = [object.object.velocity.x, object.object.velocity.y, object.object.velocity.z];
        let lastAngularVelocity = [object.object.angularVelocity.x, object.object.angularVelocity.y, object.object.angularVelocity.z];
        triggerServerEvent('session:updateObject', resourceRoot, this.code, object, lastPosition, lastRotation, lastVelocity, lastAngularVelocity);
    }

    createObject(object: SessionObject) {
        this.objects.push({
            object: object.object,
            syncer: object.syncer,
            lastPosition: object.object.position,
            lastRotation: object.object.rotation,
            lastVelocity: object.object.velocity,
            lastAngularVelocity: object.object.angularVelocity,
            beingHold: undefined
        });
    }

    getObject(object: MTASAObject | Element) {
        return this.objects.find(obj => obj.object == object);
    }

    updateObject(object: SessionObject, position: [number, number, number], rotation: [number, number, number], velocity: [number, number, number], angularVelocity: [number, number, number]) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(!position || !object || !object.object || !isElement(object.object)) return;

        object.object.position = new Vector3(position[0], position[1], position[2]);
        object.object.rotation = new Vector3(rotation[0], rotation[1], rotation[2]);
        object.object.velocity = new Vector3(velocity[0], velocity[1], velocity[2]);
        object.object.angularVelocity = new Vector3(angularVelocity[0], angularVelocity[1], angularVelocity[2]);
    }

    elementStreamIn() {
        let object = this.objects.find(object => object.object == source);
        if(!object) return;

        if(object.syncer != localPlayer as unknown as SyncPlayer) {
            triggerServerEvent('session:getObjectData', resourceRoot, this.code, object);

            iprint('get me data for ', object.object, getTickCount());
        }
    }

    elementStreamOut() {
        let object = this.objects.find(object => object.object == source);
        if(!object) return;

        if(object.syncer == localPlayer as unknown as SyncPlayer && !object.beingHold) {
            triggerServerEvent('session:noLongerSyncer', resourceRoot, this.code, object);
            // object.syncer = null as unknown as SyncPlayer;

            print('im not syncer anymore')
        }
    }

    renderDebug() {
        for(let object of this.objects) {
            let [x, y] = getScreenFromWorldPosition(object.object.position.x, object.object.position.y, object.object.position.z + 1, 0, false);
            if(x) {
                dxDrawText(`Syncer: ${object.syncer ? object.syncer.name : 'none'}`, x, y, x, y, 0xFFFFFFFF, 1, 1, 'default', 'center', 'center');
            }
        }
    }
}

export function sessionPacketInterpolationProgress(): number {
    let packetDelay = 1000/Settings.TickCount;
    return Math.min((getTickCount() - lastSyncUpdate)/packetDelay, 1);
}

export function sessionPacketInterpolate<T>(a: T, b: T, easing: EasingType): T {
    let progress = sessionPacketInterpolationProgress();

    if(typeof a === 'number' && typeof b === 'number') {
        return interpolateBetween(a, 0, 0, b, 0, 0, progress, easing)[0] as unknown as T;
    } else if(typeof a === 'string' && typeof b === 'string') {
        return progress < 0.5 ? a : b;
    } else if(Array.isArray(a) && Array.isArray(b)) {
        return a.map((val: any, i: number) => {
            return sessionPacketInterpolate(val, b[i], easing);
        }) as unknown  as T;
    }
    return a;
}

export function addSessionDataHandler(key: string, callback: SessionDataCallback, syncPlayer?: SyncPlayer, priority: number = 0) {
    sessionDataHandlers.push({
        key,
        callback,
        syncPlayer,
        priority
    });
}

export function removeSessionDataHandler(key: string, callback: SessionDataCallback, syncPlayer?: SyncPlayer) {
    sessionDataHandlers = sessionDataHandlers.filter(handler => {
        return !(
            handler.key === key && 
            handler.callback === callback &&
            (!syncPlayer || handler.syncPlayer == syncPlayer)
        );
    });
}

addEventHandler('session:dataChange', resourceRoot, (key: string, value: any, syncPlayer: SyncPlayer) => {
    sessionDataHandlers.sort((a, b) => b.priority - a.priority);
    sessionDataHandlers.forEach(handler => {
        if(handler.key === key && (!handler.syncPlayer || handler.syncPlayer == syncPlayer)) {
            handler.callback(key, value, syncPlayer);
        }
    });
});