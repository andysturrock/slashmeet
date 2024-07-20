/* eslint-disable @typescript-eslint/no-unsafe-call */
import { DateTime } from 'luxon';
import { IterationNode, Node, NonterminalNode, TerminalNode } from 'ohm-js';
import grammar, { MeetArgsActionDict, MeetArgsSemantics } from './meetArgs.ohm-bundle.js';

export type MeetingOptions = {
  name: string
  startDate: Date,
  endDate: Date,
  now: boolean,
  noCal: boolean,
  login?: boolean,
  logout?: boolean
};

/**
 * Parses userInput into a {@link MeetingOptions} object.
 * @param userInput The string to parse.
 * @param nowDate Date to use as "now" if start is not specified or is specified as "now".
 * Also used to set the day, month and year when a time is given for the start and end of the meeting.
 * @param timeZone The timezone the user is in, which may be different from the timezone this code executes in.
 * Let's say the code is executing in UTC (eg AWS Lambda always uses UTC) but the user's timezone is "America/New_York".
 * If the user specifies 10:00 as the start time for the meeting they mean 10am NY time, not 10am UTC.
 * Thus the resulting startDate will contain 05:00 UTC when EST is in place or 06:00 UTC when EDT is in place.
 * The day in UTC may even shift.  If it's 27th April 6am in Asia/Singapore that's 26th April 6pm Etc/UTC.
 * If the "login" or "logout" options are used the values of the other fields is not defined.
 * @returns A {@link MeetingOptions} object with name, startDate and endDate populated.
 * @throws {Error} on invalid userInput.
 * @see {@link meetArgs.ohm} for grammar.
 */
export function parseMeetingArgs(userInput: string, nowDate: Date, timeZone: string): MeetingOptions {

  const meetingOptions : MeetingOptions = {
    name: '',
    // Default start is nowDate
    startDate: new Date(nowDate.getTime()),
    // Default end is 1 hour after nowDate
    endDate: new Date(nowDate.getTime() + 1000 * 60 * 60), 
    now: true,
    noCal: false,
    login: false,
    logout: false
  };

  meetingOptions.startDate.setSeconds(0);
  meetingOptions.startDate.setMilliseconds(0);
  meetingOptions.endDate.setSeconds(0);
  meetingOptions.endDate.setMilliseconds(0);

  let amPm: string | undefined = undefined;
  let durationUnit: 'h' | 'm' | undefined = undefined;
  let hours = 0;
  let minutes = 0;
  let startMinute = 0;
  let endMinute = 0;
  // The slightly weird type assertions here are to help the linter.
  // See https://typescript-eslint.io/rules/no-unnecessary-condition/#when-not-to-use-it
  let startHour: number | null = null as number | null;
  let endHour: number | null = null as number | null;
  let durationMinutes: number | null = null as number | null;

  const actions: MeetArgsActionDict<MeetingOptions> = {
    Login(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      meetingOptions.now = false;
      meetingOptions.login = true;
      return meetingOptions;
    },
    Logout(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      meetingOptions.now = false;
      meetingOptions.logout = true;
      return meetingOptions;
    },
    MeetingWithArgsExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: IterationNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      return meetingOptions;
    },
    MeetingNameExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      meetingOptions.name = this.sourceString.replaceAll('"', '');
      return meetingOptions;
    },
    StartDurationExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    twentyFourHourClockExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      arg3.eval();
      arg4.eval();
      const match = this.sourceString.match(/([0-9]+):([0-9]+)/);
      if(match) {
        hours = Number.parseInt(match[1]);
        if(hours < 0 || hours > 23) {
          throw new Error("Hour must be between 0 and 23 in 24 hour clock");
        }
        minutes = Number.parseInt(match[2]);
        if(minutes < 0 || minutes > 59) {
          throw new Error("Minute must be between 0 and 59 in 24 hour clock");
        }
      }
      return meetingOptions;
    },
    meetingNamePartNoQuote(this: NonterminalNode, arg0: NonterminalNode | TerminalNode, arg1: IterationNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    meetingNamePartQuote(this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode | TerminalNode, arg2: IterationNode, arg3: TerminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      arg3.eval();
      return meetingOptions;
    },
    DurationExp(this: NonterminalNode, arg0: IterationNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
       
      const regexp = new RegExp(`([0-9]+)${durationUnit}`);
      const match = this.sourceString.match(regexp);
      if(match) {
        durationMinutes = Number.parseInt(match[1]);
        if(durationUnit == 'h') {
          durationMinutes *= 60;
        }
      }
      return meetingOptions;
    },
    oneDigitHourOnlyExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      hours = Number.parseInt(this.sourceString);
      minutes = 0;
      return meetingOptions;
    },
    twoDigitHourOnlyExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      hours = Number.parseInt(this.sourceString);
      minutes = 0;
      return meetingOptions;
    },
    hourMinuteExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
       
      const regexp = new RegExp(`([0-9]+):([0-9]+)${amPm}`);
      const match = this.sourceString.match(regexp);
      if(match) {
        hours = Number.parseInt(match[1]);
        minutes = Number.parseInt(match[2]);
      }
      return meetingOptions;
    },
    oneDigitHourAndMinutes(this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      arg3.eval();
      return meetingOptions;
    },
    StartEndTimeExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    twoDigitHourAndMinutes(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      arg3.eval();
      arg4.eval();
      return meetingOptions;
    },
    StartTimeExp(this: NonterminalNode, arg0: NonterminalNode | TerminalNode) {
      arg0.eval();
      // Start time already set to the default if start is "now"
      if(this.sourceString == 'now') {
        meetingOptions.now = true;
        return meetingOptions;
      }
      
      if(amPm) {
        if(amPm == 'pm' && hours < 12) {
          hours += 12;
        }
        amPm = undefined;
      }
      startHour = hours;
      startMinute = minutes;
      meetingOptions.now = false;
      return meetingOptions;
    },
    FinishTimeExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      if(amPm) {
        if(amPm == 'pm' && hours < 12) {
          hours += 12;
        }
        amPm = undefined;
      }
      endHour = hours;
      endMinute = minutes;
      return meetingOptions;
    },
    amPm(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      amPm = this.sourceString;
      return meetingOptions;
    },
    minOrHourExp(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      switch(this.sourceString) {
      case 'h':
      case 'm':
        durationUnit = this.sourceString;
        break;
      default:  // impossible
        throw new Error("Duration unit must be h or m");
      }
      return meetingOptions;
    },
    noCal(this: NonterminalNode, arg0: TerminalNode) {
      arg0.eval();
      meetingOptions.noCal = true;
      return meetingOptions;
    },
    _terminal(this: TerminalNode) {
      return meetingOptions;
    },
    _iter(...children: Node[]) {
      for(const node of children) {
        node.eval();
      }
      return meetingOptions;
    }
  };

  const semantics: MeetArgsSemantics = grammar.createSemantics();
  semantics.addOperation<MeetingOptions>('eval', actions);

  const matchResult = grammar.match(userInput);
  const semanticsResult = semantics(matchResult);
   
  const evalResult = semanticsResult.eval() as MeetingOptions;

  // Now create the start and end datetimes interpreted in the right timezone.
  // If the start was specified as "now" (or no start was specified, which is the same thing)
  // then we don't need to worry about timezones as now is just now wherever we are.
  // But if the user has specified a date they expect it to be in their timezone.
  if(!evalResult.now) {
    // So first shift the nowDate into the user's timezone.
    // Note this may shift the date forward or back a day.
    const nowInUserTimeZone = DateTime.fromJSDate(nowDate).setZone(timeZone);
    // Now construct the new start date.
    // If we're not "now" and haven't seen a startHour then use the shifted nowDate.
    if(!startHour) {
      startHour = nowInUserTimeZone.hour;
      startMinute = nowInUserTimeZone.minute;
    }
    const startDateObj = {
      year: nowInUserTimeZone.year,
      month: nowInUserTimeZone.month,
      day: nowInUserTimeZone.day,
      hour: startHour,
      minute: startMinute
    };
    evalResult.startDate = DateTime.fromObject(startDateObj, {zone: timeZone}).toJSDate();
  }
  // Construct the end date.  This could either be specified or given by duration.
  if(durationMinutes) {      
    evalResult.endDate = new Date(evalResult.startDate.getTime() + durationMinutes * 60 * 1000);
  }
  else if(endHour) {
    const nowInUserTimeZone = DateTime.fromJSDate(nowDate).setZone(timeZone);
    const endDateObj = {
      year: nowInUserTimeZone.year,
      month: nowInUserTimeZone.month,
      day: nowInUserTimeZone.day,
      hour: endHour,
      minute: endMinute
    };
    evalResult.endDate = DateTime.fromObject(endDateObj, {zone: timeZone}).toJSDate();
  }

  return evalResult;
}
