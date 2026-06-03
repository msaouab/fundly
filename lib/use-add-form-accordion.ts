"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export const ADD_FORM_ACCORDION_VALUE = "add-entry";

export type AddFormControls = {
  openAndFocus: () => void;
};

export function useAddFormAccordion(
  amountFocusRef: RefObject<HTMLInputElement | null> | undefined,
  internalAmountRef: RefObject<HTMLInputElement | null>,
  addFormControlsRef?: RefObject<AddFormControls | null>,
) {
  const [accordionOpen, setAccordionOpen] = useState("");

  const openAndFocusAmount = useCallback(() => {
    setAccordionOpen(ADD_FORM_ACCORDION_VALUE);
    requestAnimationFrame(() => {
      (amountFocusRef?.current ?? internalAmountRef.current)?.focus({ preventScroll: true });
    });
  }, [amountFocusRef, internalAmountRef]);

  useEffect(() => {
    if (!addFormControlsRef) return;
    addFormControlsRef.current = { openAndFocus: openAndFocusAmount };
    return () => {
      addFormControlsRef.current = null;
    };
  }, [addFormControlsRef, openAndFocusAmount]);

  return {
    accordionOpen,
    setAccordionOpen,
    openAndFocusAmount,
  };
}
