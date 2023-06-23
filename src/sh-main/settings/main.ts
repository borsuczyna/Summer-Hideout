interface Settings {
    MaxSessionPlayers: number;
    TickCount: number;
    ObjectsTickCount: number;
    StartPosition: [number, number, number][];
    StreamInDistance: number;
    DrawPhysicsDebug: boolean;
    ThrowVelocity: number;
}

export const Settings: Settings = {
    MaxSessionPlayers: 4,
    TickCount: 8,
    ObjectsTickCount: 4,
    StartPosition: [
        [-2022.98596, 157.20279, 28.83594],
        [-2022.98596, 158.20279, 28.83594],
        [-2022.98596, 159.20279, 28.83594],
        [-2022.98596, 160.20279, 28.83594],
    ],
    StreamInDistance: 50,
    DrawPhysicsDebug: true,
    ThrowVelocity: 0.25,
};