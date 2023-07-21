// AUTOGENERATED FILE
// This file was generated from meetArgs.ohm by `ohm generateBundles`.

import {
  BaseActionDict,
  Grammar,
  IterationNode,
  Node,
  NonterminalNode,
  Semantics,
  TerminalNode
} from 'ohm-js';

export interface MeetArgsActionDict<T> extends BaseActionDict<T> {
  Exp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  MeetingWithArgsExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  MeetingArgsExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  StartEndTimeExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  StartDurationExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  MeetingNameExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  meetingNamePartNoQuote?: (this: NonterminalNode, arg0: NonterminalNode, arg1: IterationNode) => T;
  meetingNamePartQuote?: (this: NonterminalNode, arg0: TerminalNode, arg1: NonterminalNode, arg2: IterationNode, arg3: TerminalNode) => T;
  StartTimeExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  FinishTimeExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  TimeExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  twentyFourHourClockExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  twelveHourClockExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  hourOnlyExp?: (this: NonterminalNode, arg0: NonterminalNode) => T;
  oneDigitHourOnlyExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  twoDigitHourOnlyExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: NonterminalNode) => T;
  hourMinuteExp?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode) => T;
  twoDigitHourAndMinutes?: (this: NonterminalNode, arg0: NonterminalNode, arg1: NonterminalNode, arg2: TerminalNode, arg3: NonterminalNode, arg4: NonterminalNode) => T;
  oneDigitHourAndMinutes?: (this: NonterminalNode, arg0: NonterminalNode, arg1: TerminalNode, arg2: NonterminalNode, arg3: NonterminalNode) => T;
  amPm?: (this: NonterminalNode, arg0: TerminalNode) => T;
  DurationExp?: (this: NonterminalNode, arg0: IterationNode, arg1: NonterminalNode) => T;
  minOrHourExp?: (this: NonterminalNode, arg0: TerminalNode) => T;
}

export interface MeetArgsSemantics extends Semantics {
  addOperation<T>(name: string, actionDict: MeetArgsActionDict<T>): this;
  extendOperation<T>(name: string, actionDict: MeetArgsActionDict<T>): this;
  addAttribute<T>(name: string, actionDict: MeetArgsActionDict<T>): this;
  extendAttribute<T>(name: string, actionDict: MeetArgsActionDict<T>): this;
}

export interface MeetArgsGrammar extends Grammar {
  createSemantics(): MeetArgsSemantics;
  extendSemantics(superSemantics: MeetArgsSemantics): MeetArgsSemantics;
}

declare const grammar: MeetArgsGrammar;
export default grammar;

