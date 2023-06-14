/* eslint-disable @typescript-eslint/no-unsafe-call */
import {IterationNode, NonterminalNode, TerminalNode} from 'ohm-js';
import grammar, {MeetArgsActionDict, MeetArgsSemantics} from './meetArgs.ohm-bundle';


export interface MeetingOptions {
  name?: string
  duration?: string
  startTime?: string
  finishTime?: string
}

export function parseMeetingArgs(userInput: string) {
  const meetingOptions : MeetingOptions = {};

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
      meetingOptions.duration = this.sourceString;
      return meetingOptions;
    },
    oneDigitHourOnlyExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      return meetingOptions;
    },
    twoDigitHourOnlyExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode) {
      arg0.eval();
      arg1.eval();
      arg2.eval();
      meetingOptions.startTime = this.sourceString;
      return meetingOptions;
    },
    hourMinuteExp(this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) {
      arg0.eval();
      arg1.eval();
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
      meetingOptions.startTime = this.sourceString;
      return meetingOptions;
    },
    FinishTimeExp(this: NonterminalNode, arg0: NonterminalNode) {
      arg0.eval();
      meetingOptions.finishTime = this.sourceString;
      return meetingOptions;
    },
    _terminal(this: TerminalNode) {
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
