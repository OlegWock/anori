import React, { useLayoutEffect, useRef, useState } from "react";
import { mergeRefs } from "react-merge-refs";
import { Tooltip } from "./Tooltip";

type PolymorphicRef<C extends React.ElementType> =
    React.ComponentPropsWithRef<C>["ref"];

type AsProp<C extends React.ElementType> = {
    as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<
    C extends React.ElementType,
    Props = {}
> = React.PropsWithChildren<Props & AsProp<C>> &
    Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

type PolymorphicComponentPropWithRef<
    C extends React.ElementType,
    Props = {}
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> };


type ClampTextToFitProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<
    C,
    { text: string, withTooltip?: boolean }
>;

type ClampTextToFitComponent = <C extends React.ElementType = "span">(
    props: ClampTextToFitProps<C>
) => React.ReactElement | null;

export const ClampTextToFit: ClampTextToFitComponent = React.forwardRef(
    <C extends React.ElementType = "span">(
        { as, text, withTooltip = false, ...props }: ClampTextToFitProps<C>,
        ref?: PolymorphicRef<C>
    ) => {
        const checkOverflow = (el: HTMLElement) => {
            if (!el) return;
            
        };

        const Component = as || "span";
        const myRef = useRef<HTMLElement>(null);
        // @ts-ignore don't know how to type all this polymorphic tricks properly
        const compoundRef = mergeRefs([ref, myRef]);
        const [trimmedText, setTrimmedText] = useState(text);
        const [isTrimmed, setIsTrimmed] = useState(false);

        useLayoutEffect(() => {
            if (!myRef.current) return;
            const el = myRef.current;
            console.log('Measuring text elemet', el);
            const ratioOverflown = el.offsetHeight / el.scrollHeight;
            if (ratioOverflown >= 1) return;
            console.log('Overflow ratio', ratioOverflown);
            const textToUse = text.startsWith(trimmedText.slice(0, trimmedText.length - 1)) ? trimmedText : text;
            const trimmedTextLength = Math.floor(textToUse.length * ratioOverflown * 0.95);
            const newTrimmedText = textToUse.slice(0, trimmedTextLength);
            console.log('Updating text to', newTrimmedText + '…');
            setTrimmedText(newTrimmedText + '…');
            setIsTrimmed(true);
        });
        
        if (withTooltip && isTrimmed) {
            return (<Tooltip label={text} showDelay={1500} placement="top" targetRef={compoundRef}>
                <Component {...props}>{trimmedText}</Component>
            </Tooltip>);
        }
        return (<Component ref={compoundRef} {...props}>{trimmedText}</Component>);
    }
);