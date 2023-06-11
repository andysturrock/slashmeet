import { parseMeetingArgs, MeetingOptions } from "../ts-src/parseMeetingArgs";


test("should be called foo", () => {
  const meetingOptions = parseMeetingArgs('foo');
  expect(meetingOptions.name).toBe('foo');
});

test("should be called foo with duration 25m", () => {
  const meetingOptions = parseMeetingArgs('foo 25m');
  expect(meetingOptions.name).toBe('foo');
  expect(meetingOptions.duration).toBe('25m');
});

test("should be called foo with start 14:00 and duration 25m", () => {
  const meetingOptions = parseMeetingArgs('foo 14:00 25m');
  expect(meetingOptions.name).toBe('foo');
  expect(meetingOptions.startTime).toBe('14:00');
  expect(meetingOptions.duration).toBe('25m');
});