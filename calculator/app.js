// Калькулятор: безопасный вычислитель выражений (без eval)

const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

let expression = ""; // текущее выражение (токены: цифры, ., +, -, *, /, %)
let justCalculated = false;

// ---------- Токенизация ----------
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch >= "0" && ch <= "9" || ch === ".") {
      let num = "";
      while (i < expr.length && (expr[i] >= "0" && expr[i] <= "9" || expr[i] === ".")) {
        num += expr[i++];
      }
      if ((num.match(/\./g) || []).length > 1) throw new Error("Неверное число");
      tokens.push({ type: "num", value: parseFloat(num) });
    } else if ("+-*/%".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
    } else if (ch === " ") {
      i++;
    } else {
      throw new Error("Недопустимый символ");
    }
  }
  return tokens;
}

// ---------- Разбор по приоритету (рекурсивный спуск) ----------
// grammar:
//   expr    := term (("+"|"-") term)*
//   term    := factor (("*"|"/"|"%") factor)*
//   factor  := ["-"|"+"] factor | number
function parse(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }

  function parseExpr() {
    let left = parseTerm();
    while (peek() && peek().type === "op" && "+-".includes(peek().value)) {
      const op = next().value;
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (peek() && peek().type === "op" && "*/%".includes(peek().value)) {
      const op = next().value;
      const right = parseFactor();
      if (op === "*") left = left * right;
      else if (op === "/") {
        if (right === 0) throw new Error("Деление на ноль");
        left = left / right;
      } else {
        if (right === 0) throw new Error("Деление на ноль");
        left = left % right;
      }
    }
    return left;
  }

  function parseFactor() {
    const t = peek();
    if (!t) throw new Error("Неполное выражение");
    if (t.type === "op" && (t.value === "-" || t.value === "+")) {
      next();
      const v = parseFactor();
      return t.value === "-" ? -v : v;
    }
    if (t.type === "num") {
      next();
      return t.value;
    }
    throw new Error("Ожидалось число");
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error("Неверное выражение");
  return result;
}

// ---------- Форматирование ----------
function formatNumber(num) {
  if (!isFinite(num)) return "Ошибка";
  // убираем проблемы с плавающей точкой (0.1+0.2)
  const rounded = Math.round(num * 1e12) / 1e12;
  let str = String(rounded);
  if (Math.abs(rounded) >= 1e15 || (rounded !== 0 && Math.abs(rounded) < 1e-9)) {
    str = rounded.toExponential(6).replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
  }
  return str.replace(".", ",");
}

function prettyExpression(expr) {
  return expr
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−")
    .replace(/\+/g, "+")
    .replace(/\./g, ",");
}

// ---------- Отображение ----------
function render() {
  expressionEl.textContent = prettyExpression(expression);
  if (expression === "") {
    resultEl.textContent = justCalculated ? resultEl.textContent : "0";
    if (!justCalculated) resultEl.textContent = "0";
  }
}

function showError(msg) {
  resultEl.textContent = msg;
  expression = "";
  justCalculated = false;
}

// ---------- Логика ввода ----------
function isOperator(ch) { return "+-*/%".includes(ch); }
function lastChar(s) { return s[s.length - 1]; }

function inputDigit(d) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }
  expression += d;
  updateResultPreview();
  render();
}

function inputOperator(op) {
  if (justCalculated) {
    justCalculated = false;
    // продолжаем с результатом
  }
  if (expression === "") {
    if (op === "-") expression = "-"; // разрешаем унарный минус
    render();
    return;
  }
  const last = lastChar(expression);
  if (isOperator(last)) {
    if (last === "-" && (op === "*" || op === "/" || op === "%")) {
      // разрешаем 5*-3
      expression += op;
    } else {
      expression = expression.slice(0, -1) + op;
    }
  } else {
    expression += op;
  }
  render();
}

function inputDot() {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }
  // ищем последнюю группу цифр
  const match = expression.match(/(\d+[.,]?\d*)$/);
  if (!match) {
    expression += "0.";
  } else if (!match[1].includes(".")) {
    expression += ".";
  }
  render();
}

function clearAll() {
  expression = "";
  justCalculated = false;
  resultEl.textContent = "0";
  render();
}

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }
  expression = expression.slice(0, -1);
  updateResultPreview();
  render();
}

function toggleSign() {
  if (expression === "" || justCalculated) return;
  // найти последнее число и поменять знак
  const m = expression.match(/(\d+(?:\.\d+)?)$/);
  if (m) {
    const numStr = m[1];
    const before = expression.slice(0, expression.length - numStr.length);
    if (before.endsWith("-") && !isOperator(before.slice(0, -1).slice(-1))) {
      expression = before.slice(0, -1) + numStr;
    } else if (before === "" || before === "-" || isOperator(lastChar(before))) {
      if (lastChar(before) === "-") {
        expression = before.slice(0, -1) + "+" + numStr;
      } else {
        expression = before + "-" + numStr;
      }
    } else {
      expression = before + "-" + numStr;
    }
    render();
  }
}

function equals() {
  if (expression === "") return;
  const last = lastChar(expression);
  if (isOperator(last)) expression = expression.slice(0, -1);
  try {
    const tokens = tokenize(expression);
    if (tokens.length === 0) return;
    const value = parse(tokens);
    expressionEl.textContent = prettyExpression(expression) + " =";
    resultEl.textContent = formatNumber(value);
    expression = String(value).replace(",", ".");
    justCalculated = true;
  } catch (e) {
    showError("Ошибка");
  }
}

function updateResultPreview() {
  if (expression === "") {
    resultEl.textContent = "0";
    return;
  }
  let expr = expression;
  const last = lastChar(expr);
  if (isOperator(last)) expr = expr.slice(0, -1);
  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      resultEl.textContent = "0";
      return;
    }
    const value = parse(tokens);
    resultEl.textContent = formatNumber(value);
  } catch (e) {
    // при неполном вводе не показываем ошибку
  }
}

// ---------- Обработчики кнопок ----------
document.querySelectorAll(".key").forEach((btn) => {
  btn.addEventListener("click", () => {
    const { value, action } = btn.dataset;
    if (action === "clear") clearAll();
    else if (action === "backspace") backspace();
    else if (action === "equals") equals();
    else if (action === "sign") toggleSign();
    else if (value) {
      if (isOperator(value)) inputOperator(value);
      else if (value === ".") inputDot();
      else inputDigit(value);
    }
  });
});

// ---------- Поддержка клавиатуры ----------
document.addEventListener("keydown", (e) => {
  const key = e.key;
  if (key >= "0" && key <= "9") inputDigit(key);
  else if (["+", "-", "*", "/", "%"].includes(key)) inputOperator(key);
  else if (key === "." || key === ",") inputDot();
  else if (key === "Enter" || key === "=") { e.preventDefault(); equals(); }
  else if (key === "Backspace") backspace();
  else if (key === "Escape") clearAll();
});

render();
