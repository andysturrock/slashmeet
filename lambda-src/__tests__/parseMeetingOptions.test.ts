import {parseMeetingArgs} from "../ts-src/parseMeetingArgs";

// All tests are in their own scope as want to use globals where we can, but changing the globals
// seems to confuse Jest.  So each test gets its own copy of any non-const variable.
const name = 'foo';
const duration = '25m';

{
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
      const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);
      const meetingOptions = parseMeetingArgs(`${meetingName}`, startDate);
      expect(meetingOptions.name).toBe(unquotedName);
      expect(meetingOptions.startDate).toStrictEqual(startDate);
      const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
      expect(meetingOptions.endDate).toStrictEqual(endDate);
    });
  }

  test(`should throw an error when starting char is not alphanumeric`, () => {
    const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);

    expect(() => parseMeetingArgs(`!alphanumeric`, startDate)).toThrowError("cannot apply Semantics to [match failed at position 0]");
    expect(() => parseMeetingArgs(`"!alphanumeric"`, startDate)).toThrowError("cannot apply Semantics to [match failed at position 1]");
  });
}

{
  const duration = '1h';
  test(`should be called ${name} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);

    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  test(`should be called ${name} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);

    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '14:00';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 14, 0, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual<Date>(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '2pm';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 14, 0, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '11pm';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 23, 0, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '1:12pm';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 13, 12, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  const finishTime = '17:00';
  test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`, startDate);
    expect(meetingOptions.name).toBe(name);
    const endDate = new Date(startDate);
    endDate.setHours(17, 0);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  const finishTime = '5pm';
  test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`, startDate);
    expect(meetingOptions.name).toBe(name);
    const endDate = new Date(startDate);
    endDate.setHours(17, 0);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  const finishTime = '11pm';
  test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`, startDate);
    expect(meetingOptions.name).toBe(name);
    const endDate = new Date(startDate);
    endDate.setHours(23, 0);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  const finishTime = '1:23pm';
  test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`, startDate);
    expect(meetingOptions.name).toBe(name);
    const endDate = new Date(startDate.getTime());
    endDate.setHours(13);
    endDate.setMinutes(23);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}

{
  const startTime = '10:23pm';
  const finishTime = '11:23pm';
  test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
    const startDate = new Date(2023, 6, 19, 22, 23, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`, startDate);
    expect(meetingOptions.name).toBe(name);
    const endDate = new Date(startDate.getTime());
    endDate.setHours(23);
    endDate.setMinutes(23);
    expect(meetingOptions.startDate).toStrictEqual(startDate);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  });
}
