import {MeetingOptions, parseMeetingArgs} from "../ts-src/parseMeetingArgs";

const fourteenHundredNinteenthJuneTwentyTwentyThree = new Date(2023, 6, 19, 14, 0, 0, 0);
const fourteenHundred = "14:00";
const twoPM = "2pm";
const elevenPM = "11pm";
const oneTwelvePM = "1:12pm";
const tenTwentyThreePM = "10:23pm";
const seventeenHundred = "17:00";
const fivePM = "5pm";
const oneTwentyThreePM = "1:23pm";
const elevenTwentyThreePM = "11:23pm";
const twentyFiveMinsDuration = "25m";
const oneHourDuration = "1h";
const fooName = "foo";
const now = "now";

describe('Check different names work', () => {
  const names = [
    '3amigos',
    'mymeeting',
    'mymeeting123',
    'my_meeting123',
    'my-meeting123',
    'pleaseattend123!',
    'please_attend123!',
    'please-attend123!',
    'attending123?',
    'attending_anyone123?',
    'attending-anyone123?',
    '"my test meeting 123"',
    '"10 amigos? -_- shouldn\'t it be 3 amigos!?"',
    '1couldn\'t!?',
  ];

  for(const meetingName of names) {
    const unquotedName = meetingName.replaceAll('"', '');

    test(`should be called ${unquotedName}`, () => {
      const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
      const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
      const actual = parseMeetingArgs(`${meetingName}`, startDate);
      const expected: MeetingOptions = {
        name: unquotedName,
        startDate,
        endDate,
        now: true,
        noCal: false,
        login: false,
        logout: false
      };
      expect(actual).toStrictEqual<MeetingOptions>(expected);
    });
  }
});

test(`should be called ${fooName} and duration ${oneHourDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${oneHourDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: true,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: true,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${fourteenHundred} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${fourteenHundred} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${twoPM} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${twoPM} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${elevenPM} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(23);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${elevenPM} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${oneTwelvePM} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(13);
  startDate.setMinutes(12);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${oneTwelvePM} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${tenTwentyThreePM} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(22);
  startDate.setMinutes(23);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${tenTwentyThreePM} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${tenTwentyThreePM} and end ${seventeenHundred}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(22);
  startDate.setMinutes(23);
  const endDate = new Date(startDate);
  endDate.setHours(17);
  endDate.setMinutes(0);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${tenTwentyThreePM} ${seventeenHundred}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${fivePM} and end ${tenTwentyThreePM}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(17);
  startDate.setMinutes(0);
  const endDate = new Date(startDate);
  endDate.setHours(22);
  endDate.setMinutes(23);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${fivePM} ${tenTwentyThreePM}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${tenTwentyThreePM} and end ${elevenPM}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(22);
  startDate.setMinutes(23);
  const endDate = new Date(startDate);
  endDate.setHours(23, 0);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${tenTwentyThreePM} ${elevenPM}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${tenTwentyThreePM} and end ${oneTwentyThreePM}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(22);
  startDate.setMinutes(23);
  const endDate = new Date(startDate.getTime());
  endDate.setHours(13);
  endDate.setMinutes(23);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${tenTwentyThreePM} ${oneTwentyThreePM}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${tenTwentyThreePM} and end ${elevenTwentyThreePM}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  startDate.setHours(22);
  startDate.setMinutes(23);
  const endDate = new Date(startDate.getTime());
  endDate.setHours(23);
  endDate.setMinutes(23);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${tenTwentyThreePM} ${elevenTwentyThreePM}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called ${fooName} with start ${now} and duration ${twentyFiveMinsDuration}`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${now} ${twentyFiveMinsDuration}`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: true,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should be called "${fooName}" with start ${now} (${fourteenHundredNinteenthJuneTwentyTwentyThree.toISOString()}) and default (1 hour) duration`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  const name = fooName;
  const actual = parseMeetingArgs(name, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: true,
    noCal: false,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`should throw an error when meeting args are empty`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  expect(() => parseMeetingArgs('', startDate)).toThrow("cannot apply Semantics to [match failed at position 0]");
});

test(`nocal option parsed correctly when present`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  const name = fooName;
  const actual = parseMeetingArgs(`${name} ${now} nocal`, startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: true,
    noCal: true,
    login: false,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`login option parsed correctly`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  const name = "";
  const actual = parseMeetingArgs("login", startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: true,
    logout: false
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});

test(`logout option parsed correctly`, () => {
  const startDate = new Date(fourteenHundredNinteenthJuneTwentyTwentyThree);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  const name = "";
  const actual = parseMeetingArgs("logout", startDate);
  const expected: MeetingOptions = {
    name,
    startDate,
    endDate,
    now: false,
    noCal: false,
    login: false,
    logout: true
  };
  expect(actual).toStrictEqual<MeetingOptions>(expected);
});
