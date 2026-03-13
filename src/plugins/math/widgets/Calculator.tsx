import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { ScrollArea } from "@anori/components/ScrollArea";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import { cachedFunc, guid } from "@anori/utils/misc";
import clsx from "clsx";
import type { MathJsInstance } from "mathjs";
import { type Ref, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const getMath = cachedFunc(() =>
  import("mathjs").then(
    (m) =>
      m.create(m.all, {
        number: "BigNumber",
        precision: 32,
      }) as MathJsInstance,
  ),
);

export const evaluate = async (expression: string) => {
  const math = await getMath();
  const result = math.evaluate(expression);
  return result;
};

export const Calculator = ({
  showAdditionalButtons,
  showHistory,
  inputRef,
}: { showAdditionalButtons: boolean; showHistory: boolean; inputRef?: Ref<HTMLInputElement> }) => {
  const doCalc = async () => {
    try {
      const result = await evaluate(expression);
      setResult(result.toString());
      setExpression(result.toString());
      setHistory((prev) => [
        ...prev,
        {
          exp: expression,
          result: result.toString(),
          id: guid(),
        },
      ]);
      runAfterRender(() => {
        historyRef.current?.scrollTo({
          top: historyRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
      trackInteraction("Evaluate");
    } catch (err) {
      console.log(err);
      setResult(t("math-plugin.cantCalc"));
    }
  };

  const addToExp = (val: string) => () => {
    setExpression((p) => p + val);
    if (!mathPreloaded.current) {
      import("mathjs");
      mathPreloaded.current = true;
    }
  };

  const onInputChange = (newVal: string) => {
    setExpression(newVal);
    if (!mathPreloaded.current) {
      import("mathjs");
      mathPreloaded.current = true;
    }
  };

  const clear = () => {
    setExpression("");
    setResult("0");
    if (expression === "" && result === "0") {
      setHistory([]);
    }
  };

  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [history, setHistory] = useState<{ exp: string; result: string; id: string }[]>([]);
  const historyRef = useRef<HTMLDivElement>(null);
  const runAfterRender = useRunAfterNextRender();
  const mathPreloaded = useRef(false);
  const { t } = useTranslation();
  const trackInteraction = useWidgetInteractionTracker();

  return (
    <div className={clsx("Calculator")}>
      {showHistory && (
        <div className="history-wrapper">
          <ScrollArea type="hover" color="dark" viewportRef={historyRef}>
            <div className="history">
              {history.map(({ exp, result, id }) => {
                return (
                  <div className="history-record" key={id}>
                    <span className="expression-shaded">{exp}</span>
                    <span className="expression-shaded">=</span>
                    <span>{result}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
      <div className="result">{result}</div>
      <Input
        value={expression}
        ref={inputRef}
        onValueChange={onInputChange}
        onKeyDown={(e) => {
          if (["Enter", "="].includes(e.key)) {
            e.preventDefault();
            doCalc();
          }
        }}
      />

      <div
        className={clsx(
          "calc-buttons",
          showAdditionalButtons && "with-additional-buttons",
          !showHistory && "all-height",
        )}
      >
        {showAdditionalButtons && (
          <>
            <Button onClick={addToExp("sin(")}>sin</Button>
            <Button onClick={addToExp("cos(")}>cos</Button>
            <Button onClick={addToExp("tan(")}>tan</Button>
          </>
        )}
        <Button onClick={clear}>C</Button>
        <Button onClick={addToExp("(")}>(</Button>
        <Button onClick={addToExp(")")}>)</Button>
        <Button onClick={addToExp("%")}>%</Button>

        {showAdditionalButtons && (
          <>
            <Button onClick={addToExp("asin(")}>asin</Button>
            <Button onClick={addToExp("acos(")}>acos</Button>
            <Button onClick={addToExp("atan(")}>atan</Button>
          </>
        )}
        <Button onClick={addToExp("7")}>7</Button>
        <Button onClick={addToExp("8")}>8</Button>
        <Button onClick={addToExp("9")}>9</Button>
        <Button onClick={addToExp("/")}>÷</Button>

        {showAdditionalButtons && (
          <>
            <Button onClick={addToExp("^2")}>
              <span>
                x<sup>2</sup>
              </span>
            </Button>
            <Button onClick={addToExp("^")}>
              <span>
                x<sup>y</sup>
              </span>
            </Button>
            <Button onClick={addToExp("sqrt(")}>√</Button>
          </>
        )}
        <Button onClick={addToExp("4")}>4</Button>
        <Button onClick={addToExp("5")}>5</Button>
        <Button onClick={addToExp("6")}>6</Button>
        <Button onClick={addToExp("*")}>×</Button>

        {showAdditionalButtons && (
          <>
            <Button onClick={addToExp("ln(")}>ln</Button>
            <Button onClick={addToExp("log(")}>log</Button>
            <Button onClick={addToExp("mod")}>mod</Button>
          </>
        )}
        <Button onClick={addToExp("1")}>1</Button>
        <Button onClick={addToExp("2")}>2</Button>
        <Button onClick={addToExp("3")}>3</Button>
        <Button onClick={addToExp("-")}>-</Button>

        {showAdditionalButtons && (
          <>
            <Button onClick={addToExp("!")}>!</Button>
            <Button onClick={addToExp("pi")}>π</Button>
            <Button onClick={addToExp("e")}>e</Button>
          </>
        )}
        <Button onClick={addToExp("0")}>0</Button>
        <Button onClick={addToExp(".")}>.</Button>
        <Button onClick={doCalc}>=</Button>
        <Button onClick={addToExp("+")}>+</Button>
      </div>
    </div>
  );
};
