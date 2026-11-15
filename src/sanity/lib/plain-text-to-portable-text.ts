import type { PortableText } from "../../../sanity.types";

// Keep the original text (including line breaks and Visual Editing encoding).
export function plainTextToPortableText(text: string): PortableText {
  return [
    {
      _type: "block",
      _key: "text",
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: "text", text, marks: [] }],
    },
  ];
}
