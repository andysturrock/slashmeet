import {parseMeetingArgs} from "../ts-src/parseMeetingArgs";
import util from 'util';

const name = 'foo';
test(`should be called ${name}`, () => {
  const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);
  const meetingOptions = parseMeetingArgs(`${name}`, startDate);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startDate).toStrictEqual(startDate);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 60);
  expect(meetingOptions.endDate).toStrictEqual(endDate);
});

const duration = '25m';
test(`should be called ${name} and duration ${duration}`, () => {
  const startDate = new Date(2023, 6, 19, 22, 50, 0, 0);
  const meetingOptions = parseMeetingArgs(`${name} ${duration}`, startDate);
  expect(meetingOptions.name).toBe(name);
  // expect(meetingOptions.duration).toBe(duration);

  expect(meetingOptions.startDate).toStrictEqual(startDate);
  const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
  expect(meetingOptions.endDate).toStrictEqual(endDate);
});

{
  const startTime = '14:00';
  test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
    const startDate = new Date(2023, 6, 19, 14, 0, 0, 0);
    const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`, startDate);
    expect(meetingOptions.name).toBe(name);
    expect(meetingOptions.startDate).toStrictEqual<Date>(startDate);
    const endDate = new Date(startDate.getTime() + 1000 * 60 * 25);
    expect(meetingOptions.endDate).toStrictEqual(endDate);
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.duration).toBe(duration);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.duration).toBe(duration);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.duration).toBe(duration);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.duration).toBe(duration);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.duration).toBe(duration);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.finishTime).toBe(finishTime);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.finishTime).toBe(finishTime);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.finishTime).toBe(finishTime);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.finishTime).toBe(finishTime);
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
  // expect(meetingOptions.startTime).toBe(startTime);
  // expect(meetingOptions.finishTime).toBe(finishTime);
  });
}
