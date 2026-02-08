import { tool } from "ai";
import { z } from "zod";

// --- Recursive-descent expression parser (zero deps, no eval) ---

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  inf: Infinity,
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  log: Math.log10,
  ln: Math.log,
  log2: Math.log2,
  log10: Math.log10,
  exp: Math.exp,
  pow: (a, b) => Math.pow(a, b!),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
};

interface Parser {
  expr: string;
  pos: number;
}

function skipWhitespace(p: Parser): void {
  while (p.pos < p.expr.length && p.expr[p.pos] === " ") p.pos++;
}

function parseNumber(p: Parser): number {
  skipWhitespace(p);
  let numStr = "";
  while (p.pos < p.expr.length && isDigitOrDot(p.expr[p.pos]!)) {
    numStr += p.expr[p.pos];
    p.pos++;
  }
  if (numStr === "") throw new Error(`Expected number at position ${p.pos}`);
  return Number(numStr);
}

function isDigitOrDot(ch: string): boolean {
  return (ch >= "0" && ch <= "9") || ch === ".";
}

function isAlpha(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

function parseIdentifier(p: Parser): string {
  let id = "";
  while (p.pos < p.expr.length && (isAlpha(p.expr[p.pos]!) || isDigitOrDot(p.expr[p.pos]!))) {
    id += p.expr[p.pos];
    p.pos++;
  }
  return id;
}

function parseArgs(p: Parser): number[] {
  const args: number[] = [];
  skipWhitespace(p);
  if (p.expr[p.pos] !== ")") {
    args.push(parseAddSub(p));
    skipWhitespace(p);
    while (p.expr[p.pos] === ",") {
      p.pos++; // skip comma
      args.push(parseAddSub(p));
      skipWhitespace(p);
    }
  }
  return args;
}

function parsePrimary(p: Parser): number {
  skipWhitespace(p);
  const ch = p.expr[p.pos];

  // Parenthesized expression
  if (ch === "(") {
    p.pos++;
    const val = parseAddSub(p);
    skipWhitespace(p);
    if (p.expr[p.pos] !== ")") throw new Error(`Expected ')' at position ${p.pos}`);
    p.pos++;
    return val;
  }

  // Unary minus / plus
  if (ch === "-" || ch === "+") {
    p.pos++;
    const val = parsePrimary(p);
    return ch === "-" ? -val : val;
  }

  // Identifier: function call or constant
  if (ch !== undefined && isAlpha(ch)) {
    const id = parseIdentifier(p).toLowerCase();
    skipWhitespace(p);

    // Function call
    if (p.expr[p.pos] === "(") {
      const fn = FUNCTIONS[id];
      if (!fn) throw new Error(`Unknown function: ${id}`);
      p.pos++; // skip '('
      const args = parseArgs(p);
      skipWhitespace(p);
      if (p.expr[p.pos] !== ")")
        throw new Error(`Expected ')' after function args at position ${p.pos}`);
      p.pos++;
      return fn(...args);
    }

    // Constant
    const c = CONSTANTS[id];
    if (c !== undefined) return c;
    throw new Error(`Unknown identifier: ${id}`);
  }

  // Number literal
  return parseNumber(p);
}

function parsePower(p: Parser): number {
  let base = parsePrimary(p);
  skipWhitespace(p);
  if (p.expr[p.pos] === "^") {
    p.pos++;
    // Right-associative: 2^3^2 = 2^(3^2) = 512
    const exp = parsePower(p);
    base = Math.pow(base, exp);
  }
  return base;
}

function parseMulDiv(p: Parser): number {
  let left = parsePower(p);
  skipWhitespace(p);
  while (p.pos < p.expr.length) {
    const op = p.expr[p.pos];
    if (op !== "*" && op !== "/" && op !== "%") break;
    p.pos++;
    const right = parsePower(p);
    if (op === "*") left *= right;
    else if (op === "/") {
      if (right === 0) throw new Error("Division by zero");
      left /= right;
    } else left %= right;
    skipWhitespace(p);
  }
  return left;
}

function parseAddSub(p: Parser): number {
  let left = parseMulDiv(p);
  skipWhitespace(p);
  while (p.pos < p.expr.length) {
    const op = p.expr[p.pos];
    if (op !== "+" && op !== "-") break;
    p.pos++;
    const right = parseMulDiv(p);
    if (op === "+") left += right;
    else left -= right;
    skipWhitespace(p);
  }
  return left;
}

/** Parse and evaluate a mathematical expression. Exported for direct unit testing. @public */
export function evaluateExpression(expr: string): number {
  const p: Parser = { expr: expr.trim(), pos: 0 };
  const result = parseAddSub(p);
  skipWhitespace(p);
  if (p.pos < p.expr.length) {
    throw new Error(`Unexpected character '${p.expr[p.pos]}' at position ${p.pos}`);
  }
  return result;
}

/** Clean float display artifacts (e.g. 0.30000000000000004 → 0.3) */
function cleanFloat(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const s = n.toPrecision(15);
  return String(Number(s));
}

export const calculate = tool({
  description:
    "Evaluate a mathematical expression. Supports +, -, *, /, %, ^ (exponentiation), parentheses, and functions like sin, cos, sqrt, abs, log, ln, min, max, etc. Constants: pi, e, tau, inf.",
  inputSchema: z.object({
    expression: z
      .string()
      .describe('The math expression to evaluate (e.g. "sqrt(2) * pi", "2^10", "0.1 + 0.2")'),
  }),
  execute: async ({ expression }) => {
    try {
      const result = evaluateExpression(expression);
      return `${expression} = ${cleanFloat(result)}`;
    } catch (err) {
      return `Error evaluating "${expression}": ${err instanceof Error ? err.message : String(err)}`;
    }
  },
});
