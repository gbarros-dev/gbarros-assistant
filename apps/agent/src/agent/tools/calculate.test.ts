import { describe, expect, it } from "vitest";

import { evaluateExpression } from "./calculate";

describe("evaluateExpression", () => {
  describe("basic arithmetic", () => {
    it("adds numbers", () => {
      expect(evaluateExpression("2 + 3")).toBe(5);
    });

    it("subtracts numbers", () => {
      expect(evaluateExpression("10 - 4")).toBe(6);
    });

    it("multiplies numbers", () => {
      expect(evaluateExpression("3 * 7")).toBe(21);
    });

    it("divides numbers", () => {
      expect(evaluateExpression("20 / 4")).toBe(5);
    });

    it("computes modulo", () => {
      expect(evaluateExpression("17 % 5")).toBe(2);
    });
  });

  describe("precedence", () => {
    it("multiplication before addition", () => {
      expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    });

    it("parentheses override precedence", () => {
      expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    });

    it("nested parentheses", () => {
      expect(evaluateExpression("((2 + 3) * (4 - 1))")).toBe(15);
    });
  });

  describe("exponentiation", () => {
    it("basic power", () => {
      expect(evaluateExpression("2 ^ 10")).toBe(1024);
    });

    it("right-associative", () => {
      // 2^3^2 = 2^(3^2) = 2^9 = 512
      expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
    });
  });

  describe("unary operators", () => {
    it("unary minus", () => {
      expect(evaluateExpression("-5")).toBe(-5);
    });

    it("unary plus", () => {
      expect(evaluateExpression("+5")).toBe(5);
    });

    it("double negative", () => {
      expect(evaluateExpression("--5")).toBe(5);
    });
  });

  describe("functions", () => {
    it("sqrt", () => {
      expect(evaluateExpression("sqrt(9)")).toBe(3);
    });

    it("abs of negative", () => {
      expect(evaluateExpression("abs(-42)")).toBe(42);
    });

    it("floor", () => {
      expect(evaluateExpression("floor(3.7)")).toBe(3);
    });

    it("ceil", () => {
      expect(evaluateExpression("ceil(3.1)")).toBe(4);
    });

    it("round", () => {
      expect(evaluateExpression("round(3.5)")).toBe(4);
    });

    it("min with multiple args", () => {
      expect(evaluateExpression("min(5, 3, 8, 1)")).toBe(1);
    });

    it("max with multiple args", () => {
      expect(evaluateExpression("max(5, 3, 8, 1)")).toBe(8);
    });

    it("pow", () => {
      expect(evaluateExpression("pow(2, 8)")).toBe(256);
    });

    it("log10", () => {
      expect(evaluateExpression("log(100)")).toBe(2);
    });

    it("ln (natural log)", () => {
      expect(evaluateExpression("ln(e)")).toBeCloseTo(1, 10);
    });

    it("sin of pi", () => {
      expect(evaluateExpression("sin(pi)")).toBeCloseTo(0, 10);
    });

    it("cos of 0", () => {
      expect(evaluateExpression("cos(0)")).toBe(1);
    });
  });

  describe("constants", () => {
    it("pi", () => {
      expect(evaluateExpression("pi")).toBeCloseTo(3.14159, 4);
    });

    it("e", () => {
      expect(evaluateExpression("e")).toBeCloseTo(2.71828, 4);
    });

    it("tau = 2*pi", () => {
      expect(evaluateExpression("tau")).toBeCloseTo(Math.PI * 2, 10);
    });

    it("inf", () => {
      expect(evaluateExpression("inf")).toBe(Infinity);
    });
  });

  describe("float precision", () => {
    it("0.1 + 0.2 is close to 0.3", () => {
      expect(evaluateExpression("0.1 + 0.2")).toBeCloseTo(0.3, 15);
    });
  });

  describe("edge cases", () => {
    it("division by zero throws", () => {
      expect(() => evaluateExpression("1 / 0")).toThrow("Division by zero");
    });

    it("unknown function throws", () => {
      expect(() => evaluateExpression("foobar(1)")).toThrow("Unknown function");
    });

    it("unknown identifier throws", () => {
      expect(() => evaluateExpression("xyz")).toThrow("Unknown identifier");
    });

    it("mismatched parenthesis throws", () => {
      expect(() => evaluateExpression("(2 + 3")).toThrow();
    });

    it("trailing characters throw", () => {
      expect(() => evaluateExpression("2 + 3 @")).toThrow();
    });

    it("empty expression throws", () => {
      expect(() => evaluateExpression("")).toThrow();
    });

    it("case insensitive functions and constants", () => {
      expect(evaluateExpression("SQRT(PI)")).toBeCloseTo(Math.sqrt(Math.PI), 10);
    });
  });

  describe("injection prevention", () => {
    it("rejects JavaScript code", () => {
      expect(() => evaluateExpression("process.exit(1)")).toThrow();
    });

    it("rejects require", () => {
      expect(() => evaluateExpression("require('fs')")).toThrow();
    });
  });
});
