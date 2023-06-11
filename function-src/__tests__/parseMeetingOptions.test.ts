import { parseMeetingArgs, MeetingOptions } from "../ts-src/parseMeetingArgs";

const name = 'foo';
test(`should be called ${name}`, () => {
  const meetingOptions = parseMeetingArgs(`${name}`);
  expect(meetingOptions.name).toBe(name);
});

const duration = '25m';
test(`should be called ${name} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.duration).toBe(duration);
});

let startTime = '14:00';
test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.duration).toBe(duration);
});

startTime = '2pm';
test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.duration).toBe(duration);
});

startTime = '11pm';
test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.duration).toBe(duration);
});

startTime = '1:12pm';
test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.duration).toBe(duration);
});

startTime = '10:23pm';
test(`should be called ${name} with start ${startTime} and duration ${duration}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${duration}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.duration).toBe(duration);
});

let finishTime = '17:00';
test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.finishTime).toBe(finishTime);
});

finishTime = '5pm';
test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.finishTime).toBe(finishTime);
});

finishTime = '11pm';
test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.finishTime).toBe(finishTime);
});

finishTime = '1:23pm'
test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.finishTime).toBe(finishTime);
});

finishTime = '11:23pm'
test(`should be called ${name} with start ${startTime} and finsh ${finishTime}`, () => {
  const meetingOptions = parseMeetingArgs(`${name} ${startTime} ${finishTime}`);
  expect(meetingOptions.name).toBe(name);
  expect(meetingOptions.startTime).toBe(startTime);
  expect(meetingOptions.finishTime).toBe(finishTime);
});