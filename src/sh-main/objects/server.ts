import { Element, MTASAObject, Ped, Vehicle } from "mtasa-lua-types/server/structure";
import { ModelType, getModelType, models } from "./shared";
import { createObject, createPed, createVehicle, setElementData, setElementModel, setElementVelocity } from "mtasa-lua-types/server/mtasa";

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

    return element;
}