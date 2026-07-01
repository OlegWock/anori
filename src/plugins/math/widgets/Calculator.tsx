import { Button } from "@anori/design-system/components/Button/Button";
import { Input } from "@anori/design-system/components/Input/Input";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useRunAfterNextRender } from "@anori/utils/hooks";
import { cachedFunc, guid } from "@anori/utils/misc";
import type { MathJsInstance } from "mathjs";
import { type Ref, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";

const calculator = css({
  flexGrow: 1,
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "2",
});
const historyWrapper = css({
  flex: "1 1 0",
  display: "flex",
  flexDirection: "column",
  paddingBottom: "4",
  marginBottom: "4",
  borderBottomWidth: "3px",
  borderBottomStyle: "solid",
  borderBottomColor: "frosted",
  "& .ScrollAreaRoot": { flex: "1 1 0" },
});
const historyList = css({ textAlign: "right", display: "flex", flexDirection: "column", gap: "2" });
const historyRecord = css({ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "2" });
const expressionShaded = css({ opacity: 0.6 });
const resultText = css({ whiteSpace: "nowrap", textAlign: "right" });
const calcButtons = cva({
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gridTemplateRows: "repeat(5, 2rem)",
    gap: "2",
    // Calc keys fill their grid cell: drop the Button's fixed height and tighten padding.
    "& > button": {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      lineHeight: "none",
      height: "auto",
      minHeight: 0,
      paddingInline: "1",
      paddingBlock: "1",
      gap: 0,
      "& sup": { fontSize: "2xs" },
    },
  },
  variants: {
    additional: { true: { gridTemplateColumns: "repeat(7, 1fr)" } },
    allHeight: { true: { flex: 1, gridTemplateRows: "repeat(5, 1fr)" } },
  },
});

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
}: {
  showAdditionalButtons: boolean;
  showHistory: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) => {
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
    <div className={calculator}>
      {showHistory && (
        <div className={historyWrapper}>
          <ScrollArea type="hover" viewportRef={historyRef}>
            <div className={historyList}>
              {history.map(({ exp, result, id }) => {
                return (
                  <div className={historyRecord} key={id}>
                    <span className={expressionShaded}>{exp}</span>
                    <span className={expressionShaded}>=</span>
                    <span>{result}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
      <div className={resultText}>{result}</div>
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

      <div className={calcButtons({ additional: showAdditionalButtons, allHeight: !showHistory })}>
        {showAdditionalButtons && (
          <>
            <Button variant="frosted" onClick={addToExp("sin(")}>
              sin
            </Button>
            <Button variant="frosted" onClick={addToExp("cos(")}>
              cos
            </Button>
            <Button variant="frosted" onClick={addToExp("tan(")}>
              tan
            </Button>
          </>
        )}
        <Button variant="frosted" onClick={clear}>
          C
        </Button>
        <Button variant="frosted" onClick={addToExp("(")}>
          (
        </Button>
        <Button variant="frosted" onClick={addToExp(")")}>
          )
        </Button>
        <Button variant="frosted" onClick={addToExp("%")}>
          %
        </Button>

        {showAdditionalButtons && (
          <>
            <Button variant="frosted" onClick={addToExp("asin(")}>
              asin
            </Button>
            <Button variant="frosted" onClick={addToExp("acos(")}>
              acos
            </Button>
            <Button variant="frosted" onClick={addToExp("atan(")}>
              atan
            </Button>
          </>
        )}
        <Button variant="frosted" onClick={addToExp("7")}>
          7
        </Button>
        <Button variant="frosted" onClick={addToExp("8")}>
          8
        </Button>
        <Button variant="frosted" onClick={addToExp("9")}>
          9
        </Button>
        <Button variant="frosted" onClick={addToExp("/")}>
          ÷
        </Button>

        {showAdditionalButtons && (
          <>
            <Button variant="frosted" onClick={addToExp("^2")}>
              <span>
                x<sup>2</sup>
              </span>
            </Button>
            <Button variant="frosted" onClick={addToExp("^")}>
              <span>
                x<sup>y</sup>
              </span>
            </Button>
            <Button variant="frosted" onClick={addToExp("sqrt(")}>
              √
            </Button>
          </>
        )}
        <Button variant="frosted" onClick={addToExp("4")}>
          4
        </Button>
        <Button variant="frosted" onClick={addToExp("5")}>
          5
        </Button>
        <Button variant="frosted" onClick={addToExp("6")}>
          6
        </Button>
        <Button variant="frosted" onClick={addToExp("*")}>
          ×
        </Button>

        {showAdditionalButtons && (
          <>
            <Button variant="frosted" onClick={addToExp("ln(")}>
              ln
            </Button>
            <Button variant="frosted" onClick={addToExp("log(")}>
              log
            </Button>
            <Button variant="frosted" onClick={addToExp("mod")}>
              mod
            </Button>
          </>
        )}
        <Button variant="frosted" onClick={addToExp("1")}>
          1
        </Button>
        <Button variant="frosted" onClick={addToExp("2")}>
          2
        </Button>
        <Button variant="frosted" onClick={addToExp("3")}>
          3
        </Button>
        <Button variant="frosted" onClick={addToExp("-")}>
          -
        </Button>

        {showAdditionalButtons && (
          <>
            <Button variant="frosted" onClick={addToExp("!")}>
              !
            </Button>
            <Button variant="frosted" onClick={addToExp("pi")}>
              π
            </Button>
            <Button variant="frosted" onClick={addToExp("e")}>
              e
            </Button>
          </>
        )}
        <Button variant="frosted" onClick={addToExp("0")}>
          0
        </Button>
        <Button variant="frosted" onClick={addToExp(".")}>
          .
        </Button>
        <Button variant="frosted" onClick={doCalc}>
          =
        </Button>
        <Button variant="frosted" onClick={addToExp("+")}>
          +
        </Button>
      </div>
    </div>
  );
};
