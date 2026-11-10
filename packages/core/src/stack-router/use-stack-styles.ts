import { useInsertionEffect } from "react";
import { ensureStackStyles } from "./styles";

/** 스택 CSS 를 첫 페인트 전에 주입 */
export const useStackStyles = () => useInsertionEffect(ensureStackStyles, []);
