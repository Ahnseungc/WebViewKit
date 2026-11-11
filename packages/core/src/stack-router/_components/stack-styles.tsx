import React from "react";
import { stackStyles, STYLE_ATTRIBUTE } from "../styles";

const attributes = { [STYLE_ATTRIBUTE]: "" };

/** 스택 CSS 를 마크업에 함께 그린다. SSR HTML 에 들어가 첫 페인트부터 스타일이 적용된다 */
export default function StackStyles() {
  return (
    <style {...attributes} dangerouslySetInnerHTML={{ __html: stackStyles }} />
  );
}
