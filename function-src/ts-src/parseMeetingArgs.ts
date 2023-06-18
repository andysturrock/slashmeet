/* eslint-disable @typescript-eslint/no-unsafe-call */
import {IterationNode, NonterminalNode, TerminalNode} from 'ohm-js';
import grammar, {MeetArgsActionDict, MeetArgsSemantics} from './meetArgs.ohm-bundle';


export interface MeetingOptions {
  name?: string
  duration?: string
  startTime?: string
  finishTime?: string
  startDate?: Date,
  endDate?: Date
}

export function parseMeetingArgs(userInput: string) {
  const now = new Date();
  now.setSeconds(0);
  now.setMilliseconds(0);
  const meetingOptions : MeetingOptions = {
    startDate: now,
    endDate: new Date(now.getTime() + 1000 * 60 * 60) // 1 hour later than start
  };

  let amPm: string | undefined = undefined;
  let durationUnit: 'h' | 'm' | undefined = undefined;
  let hours = 0;
  let minutes = 0;

  const actions: MeetArgsActionDict<MeetingOptions> = {
    MeetingWithArgsExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    MeetingNameExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      meetingOptions.name = this.sourceString;
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
        minutes = Number.parseInt(match[2]);
      }
      return meetingOptions;
    },
    meetingNameStart(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      return meetingOptions;
    },
    meetingNamePart(this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    DurationExp(this: NonterminalNode, arg0: IterationNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`DurationExp found ${this.sourceString}, durationUnit = ${durationUnit}`);
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
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`DurationExp found ${this.sourceString}, starttime = ${meetingOptions.startTime}`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      meetingOptions.endDate?.setTime(meetingOptions.startDate!.getTime() + durationMinutes * 60 * 1000);
      meetingOptions.duration = this.sourceString;
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
      console.log(`hourMinuteExp found ${this.sourceString}, amPm = ${amPm}`);
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const regexp = new RegExp(`([0-9]+):([0-9]+)${amPm}`);
      const match = this.sourceString.match(regexp);
      if(match) {
        hours = Number.parseInt(match[1]);
        minutes = Number.parseInt(match[2]);
        console.log(`match! ${hours}:${minutes}`);
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
    StartTimeExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      console.log(`StartTimeExp found ${this.sourceString}`);
      if(amPm) {
        console.log(`StartTimeExp found a 12h time with hours ${hours}`);
        if(amPm == 'pm' && hours < 12) {
          console.log(`startTimeExp adding 12 hours`);
          hours += 12;
        }
        meetingOptions.startDate?.setHours(hours);
        meetingOptions.startDate?.setMinutes(minutes);
        meetingOptions.startTime = this.sourceString;
      }
      else {
        meetingOptions.startTime = this.sourceString;
      }
      amPm = undefined;
      hours = 0;
      minutes = 0;
      return meetingOptions;
    },
    FinishTimeExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      console.log(`FinishTimeExp found ${this.sourceString}`);
      if(amPm) {
        console.log(`FinishTimeExp found a 12h time`);
        amPm = undefined;
      }
      meetingOptions.finishTime = this.sourceString;
      return meetingOptions;
    },
    amPm(this: NonterminalNode, arg0: TerminalNode) {
      console.log(`amPm found ${this.sourceString}`);
      arg0.eval();
      console.log(`amPm done eval`);
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
    _terminal(this: TerminalNode) {
      console.log(`_terminal found ${this.sourceString}`);
      return meetingOptions;
    },
    _iter(...children) {
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
