import { randomString } from "../utils/randomString";
import { Element, MTASAObject, Player, Timer, Vector3 } from "mtasa-lua-types/server/structure";
import { EventNames, addCommandHandler, addEvent, addEventHandler, client, get, getDistanceBetweenPoints3D, getElementPosition, getTickCount, iprint, killTimer, outputChatBox, outputServerLog, removeEventHandler, resourceRoot, root, setElementData, setElementDimension, setElementSyncer, setTimer, source, triggerClientEvent, triggerEvent } from "mtasa-lua-types/server/mtasa";
import { showNotification } from "../notifications/server";
import { SessionData, SyncPlayer } from "./shared";
import { Settings } from "../settings/main";
import { createCustomObject } from "../objects/server";

addEvent('session:updateObject', true);
addEvent('session:requestSyncer', true);
addEvent('session:getObjectData', true);
addEvent('session:noLongerSyncer', true);
addEvent('session:grabObject', true);
addEvent('session:dropObject', true);

interface SessionObject {
    object: MTASAObject;
    syncer: SyncPlayer;
    position: Vector3;
    rotation: Vector3;
    velocity: Vector3;
    angularVelocity: Vector3;
    beingHold: SyncPlayer | undefined;
};

enum JoinResult {
    Success = 0,
    SessionFull = 1,
    SessionStarted = 2
}

export class Session {
    code: string;
    started: boolean = false;

    ownedPlayer: Player;
    players: Player[] = [];
    dimension: number = ++sessionDimension;
    maxPlayers: number = Settings.MaxSessionPlayers;
    objects: SessionObject[] = [];

    private sessionData: SessionData[] = [];
    private sendData: SessionData[] = [];
    private sendSessionDataTimer: Timer;
    private playerQuitEvent: (this: void, ...args: any[]) => void;
    private objectUpdateEvent: (this: void, ...args: any[]) => void;
    private requestSyncerEvent: (this: void, ...args: any[]) => void;
    private getObjectDataEvent: (this: void, ...args: any[]) => void;
    private noLongerSyncerEvent: (this: void, ...args: any[]) => void;
    private grabObjectEvent: (this: void, ...args: any[]) => void;
    private dropObjectEvent: (this: void, ...args: any[]) => void;

    constructor(ownedPlayer: Player) {
        this.ownedPlayer = ownedPlayer;
        this.code = randomString(5, true);
        this.code = 'X';
        this.join(ownedPlayer);

        sessions.push(this);

        this.playerQuitEvent = () => this.playerQuit();
        this.objectUpdateEvent = (code: string, object: SessionObject, position: [number, number, number], rotation: [number, number, number], velocity: [number, number, number], angularVelocity: [number, number, number]) => {
            if(this.code != code) return;

            this.updateObject(object, position, rotation, velocity, angularVelocity);
        }
        this.requestSyncerEvent = (code: string, object: SessionObject) => {
            if(this.code != code) return;

            this.requestSyncer(object);
        }
        this.getObjectDataEvent = (code: string, object: SessionObject) => {
            if(this.code != code) return;

            this.getObjectData(object);
        }
        this.noLongerSyncerEvent = (code: string, object: SessionObject) => {
            if(this.code != code) return;

            this.noLongerSyncer(object);
        }
        this.grabObjectEvent = (code: string, object: SessionObject, rotation: [number, number, number]) => {
            if(this.code != code) return;

            this.grabObject(object, rotation);
        }
        this.dropObjectEvent = (code: string, object: SessionObject, velocity: [number, number, number]) => {
            if(this.code != code) return;

            this.dropObject(object, velocity);
        }
        addEventHandler(EventNames.OnPlayerQuit, root, this.playerQuitEvent);
        addEventHandler('session:updateObject', resourceRoot, this.objectUpdateEvent);
        addEventHandler('session:requestSyncer', resourceRoot, this.requestSyncerEvent);
        addEventHandler('session:getObjectData', resourceRoot, this.getObjectDataEvent); 
        addEventHandler('session:noLongerSyncer', resourceRoot, this.noLongerSyncerEvent);
        addEventHandler('session:grabObject', resourceRoot, this.grabObjectEvent);
        addEventHandler('session:dropObject', resourceRoot, this.dropObjectEvent);
        this.sendSessionDataTimer = setTimer(() => this.sendSessionData(), 1000/Settings.TickCount, 0);
        
        outputServerLog(`New session created with code: ${this.code} by ${ownedPlayer.name}`);
    }

    destroy() {
        removeEventHandler(EventNames.OnPlayerQuit, root, this.playerQuitEvent);
        removeEventHandler('session:updateObject', resourceRoot, this.objectUpdateEvent);
        removeEventHandler('session:requestSyncer', resourceRoot, this.requestSyncerEvent);
        removeEventHandler('session:getObjectData', resourceRoot, this.getObjectDataEvent);
        removeEventHandler('session:noLongerSyncer', resourceRoot, this.noLongerSyncerEvent);
        removeEventHandler('session:grabObject', resourceRoot, this.grabObjectEvent);
        removeEventHandler('session:dropObject', resourceRoot, this.dropObjectEvent);
        killTimer(this.sendSessionDataTimer);

        sessions = sessions.filter(session => session !== this);
        outputServerLog(`Session ${this.code} destroyed`);
    }

    updateObject(object: SessionObject, position: [number, number, number], rotation: [number, number, number], velocity: [number, number, number], angularVelocity: [number, number, number]) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(object.syncer !== client) return;

        object.position = new Vector3(...position);
        object.rotation = new Vector3(...rotation);
        object.velocity = new Vector3(...velocity);
        object.angularVelocity = new Vector3(...angularVelocity);

        this.players.forEach(player => {
            if(player == object.syncer) return;
            triggerClientEvent(player, 'session:updateObject', resourceRoot, object, position, rotation, velocity, angularVelocity);
        });
    }

    private playerQuit() {
        this.players = this.players.filter(player => player !== source as Player);
        for(let player of this.players) {
            triggerClientEvent(player, 'session:playerQuit', resourceRoot, source);
        }

        // select new session owner when owner leaves
        if(this.ownedPlayer == source) {
            if(this.players.length > 0) {
                let newSessionOwner = this.players[0];
                this.ownedPlayer = newSessionOwner;
                showNotification(newSessionOwner, `You are now the session owner`, 'info');

                outputChatBox(`Session ${this.code} owner changed to ${newSessionOwner.name}`);
            } else this.destroy();
        }
    }

    join(player: Player): JoinResult {
        if(this.started) return JoinResult.SessionStarted;
        if(this.players.length >= this.maxPlayers) return JoinResult.SessionFull;

        this.players.push(player);
        triggerClientEvent(player, 'session:join', resourceRoot, this.code, this.dimension);

        // inform owner about new player in session
        if(this.ownedPlayer !== player) showNotification(this.ownedPlayer, `${player.name} has joined session`, 'info');

        outputServerLog(`${player.name} joined session ${this.code}`);

        return JoinResult.Success;
    }
    
    start() {
        this.players.forEach((player, i) => {
            player.position = new Vector3(...Settings.StartPosition[i]);
            player.dimension = this.dimension;
            
            triggerClientEvent(player, 'session:start', resourceRoot, this.players);
        });

        this.started = true;

        triggerEvent('game:started', resourceRoot, this);
        outputServerLog(`Session ${this.code} started`);
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
            sentBy
        });
    }

    getSendData(key: string, syncPlayer?: SyncPlayer) {
        return this.sendData.find(data => data.key === key && (!syncPlayer || data.syncPlayer == syncPlayer));
    }

    setSendData(key: string, value: any, sentBy: SyncPlayer, syncPlayer?: SyncPlayer) {
        let existingData = this.getSendData(key, syncPlayer);
        if(existingData) existingData.value = value;
        else this.sendData.push({
            syncPlayer,
            key,
            value,
            sentBy
        });
    }

    updateData(sessionData: SessionData[]) {
        sessionData.forEach(data => {
            this.setSessionData(data.key, data.value, data.sentBy, data.syncPlayer);
            this.setSendData(data.key, data.value, data.sentBy, data.syncPlayer);
        });
    }

    sendSessionData() {
        if(this.sendData.length == 0) return;

        for(let player of this.players) {
            triggerClientEvent(player, 'session:dataUpdate', resourceRoot, this.sendData);
        }

        this.sendData = [];
    }

    createObject(name: string, x: number, y: number, z: number, rx?: number, ry?: number, rz?: number): MTASAObject | undefined {
        let object: Element | undefined = createCustomObject<MTASAObject>(name, x, y, z, rx, ry, rz) as Element | undefined;
        if(!object) return undefined;

        setElementDimension(object, this.dimension);
        setElementData(object, 'object:session', this.code);

        let data: SessionObject = {
            object: object as unknown as MTASAObject,
            syncer: this.getPerfectObjectSyncer(object),
            position: new Vector3(x, y, z),
            rotation: new Vector3(rx || 0, ry || 0, rz || 0),
            velocity: new Vector3(0, 0, 0),
            angularVelocity: new Vector3(0, 0, 0),
            beingHold: undefined
        };
        this.objects.push(data);

        for(let player of this.players) {
            triggerClientEvent(player, 'session:createObject', resourceRoot, data);
        }

        return object as unknown as MTASAObject;
    }

    getPerfectObjectSyncer(object: Element): SyncPlayer {
        let [ox, oy, oz] = getElementPosition(object);
        let players = this.players.sort((a, b) => {
            let [ax, ay, az] = getElementPosition(a);
            let [bx, by, bz] = getElementPosition(b);
            let aDistance = getDistanceBetweenPoints3D(ax, ay, az, ox, oy, oz);
            let bDistance = getDistanceBetweenPoints3D(bx, by, bz, ox, oy, oz);
            return aDistance - bDistance;
        });

        return players[0];
    }

    requestSyncer(object: SessionObject) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(object.syncer !== client) return;

        object.syncer = client;
        setElementSyncer(object.object as unknown as Element, object.syncer);
        this.players.forEach(player => {
            triggerClientEvent(player, 'session:setSyncer', resourceRoot, object, client);
        });
    }

    getObjectData(object: SessionObject) {
        object = this.objects.find(obj => obj.object == object.object)!;

        let position = object.position;
        let rotation = object.rotation;
        let velocity = object.velocity;
        let angularVelocity = object.angularVelocity;
        
        triggerClientEvent(client, 'session:updateObject', resourceRoot, object, position, rotation, velocity, angularVelocity);
    }

    noLongerSyncer(object: SessionObject) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(object.syncer !== client) return;

        object.syncer = this.getPerfectObjectSyncer(object.object as unknown as Element);
        setElementSyncer(object.object as unknown as Element, object.syncer);
        this.players.forEach(player => {
            triggerClientEvent(player, 'session:setSyncer', resourceRoot, object, object.syncer);
        });
    }

    grabObject(object: SessionObject, rotation: [number, number, number]) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(object.beingHold) return;

        object.beingHold = client;
        object.syncer = client;
        setElementSyncer(object.object as unknown as Element, object.syncer);
        
        this.players.forEach(player => {
            triggerClientEvent(player, 'session:grabObject', resourceRoot, object, rotation, client);
        });
    }

    dropObject(object: SessionObject, velocity: [number, number, number]) {
        object = this.objects.find(obj => obj.object == object.object)!;
        if(object.beingHold !== client) return;

        object.beingHold = undefined;
        object.syncer = client;
        setElementSyncer(object.object as unknown as Element, object.syncer);
        
        this.players.forEach(player => {
            triggerClientEvent(player, 'session:dropObject', resourceRoot, object, object.syncer, velocity);
        });
    }
}

export let sessions: Session[] = [];
let sessionDimension: number = 1; // start from 1

export function getPlayerSession(player: Player): Session | undefined {
    return sessions.find(session => session.players.includes(player));
}

export function findSessionByCode(code: string): Session | undefined {
    return sessions.find(session => session.code === code);
}

export function createSession(player: Player) {
    if (getPlayerSession(player)) return showNotification(player, 'You\'re already in a session', 'error');

    const session = new Session(player);
    showNotification(player, `Created session, your code is: ${session.code}`, 'success');
}

export function joinSession(player: Player, code: string) {
    if (getPlayerSession(player)) return showNotification(player, 'You\'re already in a session', 'error');
    let session = findSessionByCode(code);
    if (!session) return showNotification(player, 'Session not found', 'error');

    let statusCode = session.join(player);
    if (statusCode == JoinResult.Success) showNotification(player, `Joined session of player ${session.ownedPlayer.name}`, 'success');
    else if(statusCode == JoinResult.SessionFull) showNotification(player, 'Failed to join session, it\'s full', 'error');
    else if(statusCode == JoinResult.SessionStarted) showNotification(player, 'Failed to join session, it has already started', 'error');
}

export function startSession(player: Player) {
    let session = getPlayerSession(player);
    if (!session) return showNotification(player, 'You\'re not in a session', 'error');
    if (session.started) return showNotification(player, 'Session is already started', 'error');

    session.start();
}

addEvent('session:dataUpdate', true);
addEventHandler('session:dataUpdate', root, (code: string, updateData: SessionData[]) => {
    let session = findSessionByCode(code);
    if(!session) return;

    session.updateData(updateData);
});

// @DEBUG

addCommandHandler('create', (player: Player): any => {
    createSession(player);
});

addCommandHandler('join', (player: Player, cmd: string, code: string): any => {
    joinSession(player, code);
});

addCommandHandler('starts', (player: Player) => {
    startSession(player);
});