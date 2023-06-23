import { addEvent, addEventHandler, resourceRoot } from "mtasa-lua-types/server/mtasa";
import { Session, findSessionByCode } from "../session/server";

addEvent('game:started', true);
addEventHandler('game:started', resourceRoot, (session: Session) => {
    // mta events are not working with classes
    session = findSessionByCode(session.code)!;

    for(let i = 1; i < 5; i++) {
        session.createObject('sausages', -2016.96655, 159.41061 + i, 27.74627);
    }
    for(let i = 6; i < 10; i++) {
        session.createObject('ball', -2016.96655, 159.41061 + i, 27.74627);
    }
});