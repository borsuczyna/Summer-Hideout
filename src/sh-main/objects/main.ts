import { Element, EventNames, MTASAObject, Ped, Vehicle, addEventHandler, createObject, createPed, createVehicle, engineImportTXD, engineLoadCOL, engineLoadDFF, engineLoadTXD, engineReplaceCOL, engineReplaceModel, engineRequestModel, engineSetModelPhysicalPropertiesGroup, fileExists, getCameraMatrix, getDistanceBetweenPoints3D, getElementAngularVelocity, getElementData, getElementPosition, getElementVelocity, getElementsByType, root, setElementAngularVelocity, setElementData, setElementDimension, setElementModel, setElementVelocity, setObjectMass, source, triggerEvent } from "mtasa-lua-types/client/mtasa";
import { showNotification } from "../notifications/client";
import { ModelData, ModelType, getModelType, models } from "./shared";
import { Settings } from "../settings/main";
import { addElementPhysics } from "./physics";

let objectsStreamedInData: {
    object: MTASAObject;
    streamedIn: boolean;
}[] = [];

function replaceModel(data: ModelData) {
    let model = engineRequestModel(getModelType(data.parent), data.parent);
    if(!model) showNotification(`Failed to load model ${data.name}!`, 'error');
    
    if(fileExists(`objects/data/${data.name}/${data.name}.txd`)) {
        engineImportTXD(engineLoadTXD(`objects/data/${data.name}/${data.name}.txd`), model);
    }
    
    if(fileExists(`objects/data/${data.name}/${data.name}.dff`)) {
        engineReplaceModel(engineLoadDFF(`objects/data/${data.name}/${data.name}.dff`), model);
    }
    
    if(fileExists(`objects/data/${data.name}/${data.name}.col`)) {
        engineReplaceCOL(engineLoadCOL(`objects/data/${data.name}/${data.name}.col`), model);
    }
    
    if(data.physics) engineSetModelPhysicalPropertiesGroup(model, 154);
    
    print(`Loading model ${data.name} (${model})`);
    data.model = model;
}

function onElementStreamIn() {
    let model = getElementData(source, 'custom-model');
    if(!model) return;

    let data = models.find(m => m.name == model);
    if(!data) return;

    if(!data.model) replaceModel(data);
    if(!data.model) return;
    
    let [vx, vy, vz] = getElementVelocity(source);
    let [ax, ay, az] = getElementAngularVelocity(source);

    setElementModel(source, data.model);
    if(data.mass && getModelType(data.model) == ModelType.Object) setObjectMass(source as MTASAObject, data.mass);
    if(data.physics && data.model) engineSetModelPhysicalPropertiesGroup(data.model, 154);
    if(data.physics) addElementPhysics(source as MTASAObject);

    setElementVelocity(source, vx, vy, vz);
    setElementAngularVelocity(source, ax, ay, az);
}

export function createCustomObject<T extends MTASAObject | Vehicle | Ped>(name: string, ...args: any[]): T | undefined {
    let model = models.find(m => m.name == name);
    if(!model) return undefined;

    let type = getModelType(model.parent);
    let element: T;

    if(type == ModelType.Object) element = createObject(model.parent, ...args as [number, number, number, number, number, number]) as T;
    else if(type == ModelType.Vehicle) element = createVehicle(model.parent, ...args as [number, number, number, number, number, number]) as T;
    else element = createPed(model.parent, ...args as [number, number, number, number]) as T;

    setElementData(element as Element, 'custom-model', model.name);
    if(model.model) setElementModel(element as Element, model.model);
    if(model.physics && model.model) engineSetModelPhysicalPropertiesGroup(model.model, 154);

    return element;
}

function onClientRender() {
    let [x, y, z] = getCameraMatrix();

    let objects = getElementsByType('object', root, true) as unknown as MTASAObject[];
    for(let object of objects) {
        let [ox, oy, oz] = getElementPosition(object);
        let distance = getDistanceBetweenPoints3D(x, y, z, ox, oy, oz);
        let streamedIn = distance <= Settings.StreamInDistance;

        let data = objectsStreamedInData.find(d => d.object == object);
        if(!data) {
            if(streamedIn) triggerEvent('object:onStreamIn', object, streamedIn);
            else triggerEvent('object:onStreamOut', object, streamedIn);

            objectsStreamedInData.push({
                object,
                streamedIn,
            });
        } else {
            if(data.streamedIn != streamedIn) {
                if(streamedIn) triggerEvent('object:onStreamIn', object, streamedIn);
                else triggerEvent('object:onStreamOut', object, streamedIn);

                data.streamedIn = streamedIn;
            }
        }
    }
}

addEventHandler(EventNames.OnClientElementStreamIn, root, onElementStreamIn);
addEventHandler(EventNames.OnClientRender, root, onClientRender);