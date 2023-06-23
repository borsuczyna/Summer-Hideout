export function clamp(n: number, min: number, max: number) {
    if (min < 0 && max > 0) {
        if(n < 0) return Math.max(n, min);
        return Math.min(n, max);
    }
    
    return Math.min(Math.max(n, min), max);
}