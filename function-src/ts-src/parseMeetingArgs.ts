import { TerminalNode } from 'ohm-js';
import grammar, { MeetArgsActionDict, MeetArgsSemantics } from './meetArgs.ohm-bundle';


export interface MeetingOptions {
  name?: string
  duration?: string
  startTime?: string
}

export function parseMeetingArgs(userInput: string) {
  const meetingOptions : MeetingOptions = {};

  const actions: MeetArgsActionDict<MeetingOptions> = {
    MeetingWithArgsExp(x, y) {
      x.eval();
      y.eval();
      // meetingOptions.name = this.sourceString;
      console.log(`found MeetingWithArgsExp ${this.sourceString}`);
      return meetingOptions;
    },
    MeetingNameExp(x, y) {
      x.eval();
      y.eval();
      meetingOptions.name = this.sourceString;
      console.log(`found MeetingNameExp ${this.sourceString}`);
      return meetingOptions;
    },
    StartDurationExp(x, y) {
      x.eval();
      y.eval();
      console.log(`found StartDurationExp ${this.sourceString}`);
      return meetingOptions;
    },
    twentyFourHourClockExp(a, b, c, d, e) {
      a.eval();
      b.eval();
      c.eval();
      d.eval();
      e.eval();
      meetingOptions.startTime = this.sourceString;
      console.log(`found twentyFourHourClockExp ${this.sourceString}`);
      return meetingOptions;
    },
    meetingNameStart(x) {
      x.eval();
      console.log(`found meetingNameStart ${this.sourceString}`);
      return meetingOptions;
    },
    meetingNamePart(x, y) {
      x.eval();
      y.eval();
      console.log(`found meetingNamePart ${this.sourceString}`);
      return meetingOptions;
    },
    DurationExp(x, y) {
      x.eval();
      y.eval();
      console.log(`found DurationExp ${this.sourceString}`);
      meetingOptions.duration = this.sourceString;
      return meetingOptions;
    },
    _terminal(this: TerminalNode) {
      console.log(`found _terminal ${this.sourceString}`);
      return meetingOptions;
    },
    _iter(...children) {
      console.log(`found children ${this.sourceString}`);
      return meetingOptions;
    }
  }

  const semantics: MeetArgsSemantics = grammar.createSemantics();
  semantics.addOperation<MeetingOptions>('eval', actions);

  const matchResult = grammar.match(userInput);
  const semanticsResult = semantics(matchResult);
  const evalResult = semanticsResult.eval();
  return evalResult as MeetingOptions;
}
