export function randomString(length: number, onlyCapitals: boolean = false): string {
    const characters = onlyCapitals ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
  
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
  
    return result;
}  