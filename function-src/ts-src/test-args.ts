import { parseMeetingArgs } from "./parseMeetingArgs";

let userInput = 'foo'
let meetingOptions = parseMeetingArgs(userInput);
console.log(`parsing ${userInput} => result = ${JSON.stringify(meetingOptions)}`);

userInput = 'foo 25m';
meetingOptions = parseMeetingArgs(userInput);
console.log(`parsing ${userInput} => result = ${JSON.stringify(meetingOptions)}`);

userInput = 'foo 14:00 25m';
meetingOptions = parseMeetingArgs(userInput);
console.log(`parsing ${userInput} => result = ${JSON.stringify(meetingOptions)}`);

userInput = 'foo 2pm 25m';
meetingOptions = parseMeetingArgs(userInput);
console.log(`parsing ${userInput} => result = ${JSON.stringify(meetingOptions)}`);

