import {generateImmediateSlackResponseBlocks} from "../ts-src/generateImmediateSlackResponseBlocks";

describe("test generateImmediateSlackResponseBlocks function", () => {
  it("should generate some blocks", () => {
    expect(generateImmediateSlackResponseBlocks()).toBeDefined();
  });
});