/* eslint-disable @typescript-eslint/no-unsafe-call */
import {IterationNode, Node, NonterminalNode, TerminalNode} from 'ohm-js';
import grammar, {MeetArgsActionDict, MeetArgsSemantics} from './meetArgs.ohm-bundle';

export interface MeetingOptions {
  name: string
  startDate: Date,
  endDate: Date,
  now: boolean,
  noCal: boolean,
  login?: boolean,
  logout?: boolean
}

/**
 * Parses userInput into a {@link MeetingOptions} object.
 * @param userInput The string to parse.
 * @param nowDate Date to use as "now" if start is not specified or is specified as "now".
 * Also used to set the day, month and year when a time is given for the start and end of the meeting.
 * @returns A {@link MeetingOptions} object with name, startDate and endDate populated.
 * @throws {Error} on invalid userInput.
 * @see {@link meetArgs.ohm} for grammar.
 */
export function parseMeetingArgs(userInput: string, nowDate: Date): MeetingOptions {

  const meetingOptions : MeetingOptions = {
    name: '',
    startDate: new Date(nowDate.getTime()),
    endDate: new Date(nowDate.getTime() + 1000 * 60 * 60), // 1 hour later than start
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
      let durationMinutes = 0;
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const regexp = new RegExp(`([0-9]+)${durationUnit}`);
      const match = this.sourceString.match(regexp);
      if(match) {
        durationMinutes = Number.parseInt(match[1]);
        if(durationUnit == 'h') {
          durationMinutes *= 60;
        }
      }
      meetingOptions.endDate?.setTime(meetingOptions.startDate.getTime() + durationMinutes * 60 * 1000);
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
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
      meetingOptions.startDate.setHours(hours);
      meetingOptions.startDate.setMinutes(minutes);
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
      meetingOptions.endDate.setHours(hours);
      meetingOptions.endDate.setMinutes(minutes);
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const evalResult = semanticsResult.eval();
  return evalResult as MeetingOptions;
}
