export function moment(seconds: number, format: string = '{1} {2} {3} {4} {5}'): string {
    let absSeconds = Math.abs(seconds);

    let text = format;
    if(absSeconds < 60) {
        text = text.replace('{1}', `${absSeconds} second${absSeconds === 1 ? '' : 's'}`);
        for(let i = 2; i <= 5; i++) text = text.replace(`{${i}}`, '');
        text = text.trim();
    } else if(absSeconds < 60 * 60) {
        let minutes = Math.floor(absSeconds / 60);
        let seconds = Math.floor(absSeconds % 60);
        text = text.replace('{1}', `${minutes} minute${minutes === 1 ? '' : 's'}`);
        text = text.replace('{2}', `${seconds} second${seconds === 1 ? '' : 's'}`);
        for(let i = 3; i <= 5; i++) text = text.replace(`{${i}}`, '');
        text = text.trim();
    } else if(absSeconds < 60 * 60 * 24) {
        let hours = Math.floor(absSeconds / (60 * 60));
        let minutes = Math.floor((absSeconds % (60 * 60)) / 60);
        let seconds = Math.floor(absSeconds % 60);
        text = text.replace('{1}', `${hours} hour${hours === 1 ? '' : 's'}`);
        text = text.replace('{2}', `${minutes} minute${minutes === 1 ? '' : 's'}`);
        text = text.replace('{3}', `${seconds} second${seconds === 1 ? '' : 's'}`);
        for(let i = 4; i <= 5; i++) text = text.replace(`{${i}}`, '');
        text = text.trim();
    } else if(absSeconds < 60 * 60 * 24 * 7) {
        let days = Math.floor(absSeconds / (60 * 60 * 24));
        let hours = Math.floor((absSeconds % (60 * 60 * 24)) / (60 * 60));
        let minutes = Math.floor((absSeconds % (60 * 60)) / 60);
        let seconds = Math.floor(absSeconds % 60);
        text = text.replace('{1}', `${days} day${days === 1 ? '' : 's'}`);
        text = text.replace('{2}', `${hours} hour${hours === 1 ? '' : 's'}`);
        text = text.replace('{3}', `${minutes} minute${minutes === 1 ? '' : 's'}`);
        text = text.replace('{4}', `${seconds} second${seconds === 1 ? '' : 's'}`);
        text = text.replace('{5}', '');
        text = text.trim();
    } else if(absSeconds < 60 * 60 * 24 * 365) {
        let weeks = Math.floor(absSeconds / (60 * 60 * 24 * 7));
        let days = Math.floor((absSeconds % (60 * 60 * 24 * 7)) / (60 * 60 * 24));
        let hours = Math.floor((absSeconds % (60 * 60 * 24)) / (60 * 60));
        let minutes = Math.floor((absSeconds % (60 * 60)) / 60);
        let seconds = Math.floor(absSeconds % 60);
        text = text.replace('{1}', `${weeks} week${weeks === 1 ? '' : 's'}`);
        text = text.replace('{2}', `${days} day${days === 1 ? '' : 's'}`);
        text = text.replace('{3}', `${hours} hour${hours === 1 ? '' : 's'}`);
        text = text.replace('{4}', `${minutes} minute${minutes === 1 ? '' : 's'}`);
        text = text.replace('{5}', `${seconds} second${seconds === 1 ? '' : 's'}`);
        text = text.trim();
    } else {
        let years = Math.floor(absSeconds / (60 * 60 * 24 * 365));
        let weeks = Math.floor((absSeconds % (60 * 60 * 24 * 365)) / (60 * 60 * 24 * 7));
        let days = Math.floor((absSeconds % (60 * 60 * 24 * 7)) / (60 * 60 * 24));
        let hours = Math.floor((absSeconds % (60 * 60 * 24)) / (60 * 60));
        let minutes = Math.floor((absSeconds % (60 * 60)) / 60);
        let seconds = Math.floor(absSeconds % 60);
        text = text.replace('{1}', `${years} year${years === 1 ? '' : 's'}`);
        text = text.replace('{2}', `${weeks} week${weeks === 1 ? '' : 's'}`);
        text = text.replace('{3}', `${days} day${days === 1 ? '' : 's'}`);
        text = text.replace('{4}', `${hours} hour${hours === 1 ? '' : 's'}`);
        text = text.replace('{5}', `${minutes} minute${minutes === 1 ? '' : 's'}`);
        text = text.replace('{6}', `${seconds} second${seconds === 1 ? '' : 's'}`);
        text = text.trim();
    }

    return seconds > 0 ? `in ${text}` : `${text} ago`;
}