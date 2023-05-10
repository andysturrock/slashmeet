import * as dotenv from 'dotenv';
dotenv.config();

import {StackProps} from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

/**
 * Returns value of given environment variable, which may be read from .env file.
 * @param name Name of environment variable
 * @param optional Controls behaviour if the variable is not set.
 * If the optional flag is set to true, then if the variable is not set undefined is returned.
 * If the optional flag is set to false, then if the variable is not set an Error is thrown.
 * Thus it is safe to use ! to assert a variable is defined if the optional flag is true.
 */
export function getEnv(name: string, optional = false): string | undefined {
  const val = process.env[name];
  if((val === undefined) && !optional) {
    console.error(`${name} env var not set`);
    throw new Error(`${name} env var not set`);
  }
  return val;
}

export interface LambdaStackProps extends StackProps {
  readonly slackIdToGCalTokenTable: dynamodb.Table;
}