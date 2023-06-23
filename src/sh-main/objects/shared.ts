import { engineGetModelPhysicalPropertiesGroup } from "mtasa-lua-types/client/mtasa";

export interface ModelData {
    name: string;
    parent: number;
    physics?: boolean;
    model?: number;
    mass?: number;
    bounciness?: number;
}

export enum ModelType {
    Object = 'object',
    Vehicle = 'vehicle',
    Ped = 'ped',
}

export let models: ModelData[] = [
    {
        name: 'sausages',
        parent: 3092,
        physics: true,
        mass: 0.1,
        bounciness: 0
    },
    {
        name: 'ball',
        parent: 3092,
        physics: true,
        mass: 0.1,
        bounciness: 1
    },
];

export function doesObjectHavePhysics(model: number): boolean {
    for(let modelData of models) {
        if(modelData.model && modelData.model == model && modelData.physics) return true;
    }
    if(engineGetModelPhysicalPropertiesGroup(model) == 154) return true;
    return false;
}

export function getObjectBounciness(model: number): number {
    for(let modelData of models) {
        if(modelData.model && modelData.model == model && modelData.bounciness) return modelData.bounciness/2;
    }
    return 0;
}

export function getModelType(model: number): ModelType {
    if(model >= 400 && model <= 611) {
        return ModelType.Vehicle;
    } else if(model >= 0 && model <= 312) {
        return ModelType.Ped;
    } else {
        return ModelType.Object;
    }
}