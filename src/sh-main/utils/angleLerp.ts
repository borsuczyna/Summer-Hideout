function normalizeAngle(angle: number): number {
    angle %= 360;
    if (angle < -180) {
        angle += 360;
    } else if (angle > 180) {
        angle -= 360;
    }
    return angle;
}

export function angleLerp(a: number, b: number, t: number): number {
    // Normalize angles to the range of -180 to 180
    a = normalizeAngle(a);
    b = normalizeAngle(b);
  
    // Calculate the shortest angular distance between a and b
    let delta = ((b - a + 540) % 360) - 180;
  
    // Perform the interpolation
    let interpolatedAngle = a + delta * t;
  
    // Normalize the result to the range of -180 to 180
    interpolatedAngle = normalizeAngle(interpolatedAngle);
  
    return interpolatedAngle;
}