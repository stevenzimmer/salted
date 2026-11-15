import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StorageGuide } from "../src/components/content/storage-guide";
import { plainTextToPortableText } from "../src/sanity/lib/plain-text-to-portable-text";
import { migrateStorageRichText } from "../scripts/migrations/storage-rich-text";

test("storage migration preserves wording, line breaks, cleared values and each draft independently", () => {
  for (const _id of ["storageHeatingPage", "drafts.storageHeatingPage"]) {
    const richText = plainTextToPortableText("Already formatted");
    const document = {
      _id,
      _type: "storageHeatingPage",
      guide: {
        shortTermTitle: "Keep this title",
        shortTermBody: `${_id}\nSecond line\n\nNext paragraph`,
        freezerBody: richText,
        ovenBody: "",
        note: "Keep this notice",
      },
    };
    const original = structuredClone(document);
    const updates = migrateStorageRichText(document);
    assert.deepEqual(document, original);
    assert.deepEqual(Object.keys(updates ?? {}), [
      "guide.shortTermBody",
      "guide.ovenBody",
    ]);
    assert.equal(
      updates?.["guide.shortTermBody"][0].children?.[0].text,
      document.guide.shortTermBody,
    );
    assert.equal(updates?.["guide.ovenBody"][0].children?.[0].text, "");
    assert.equal(
      migrateStorageRichText({
        ...document,
        guide: {
          ...document.guide,
          shortTermBody: updates?.["guide.shortTermBody"],
          ovenBody: updates?.["guide.ovenBody"],
        },
      }),
      null,
    );
  }
  assert.equal(migrateStorageRichText({ _type: "storageHeatingPage" }), null);
  assert.equal(
    migrateStorageRichText({ _type: "anotherPage", guide: {} }),
    null,
  );
});

test("storage guide renders body-only content, line breaks, lists and inline formatting", () => {
  const html = renderToStaticMarkup(
    createElement(StorageGuide, {
      guide: {
        shortTermBody: plainTextToPortableText("First line\nSecond line"),
        freezerBody: [
          {
            ...plainTextToPortableText("First bullet")[0],
            listItem: "bullet",
            level: 1,
          },
          {
            ...plainTextToPortableText("Second bullet")[0],
            _key: "second",
            listItem: "bullet",
            level: 1,
          },
        ],
        ovenBody: [
          {
            ...plainTextToPortableText("Numbered step")[0],
            listItem: "number",
            level: 1,
            children: [
              {
                _type: "span",
                _key: "bold",
                text: "Numbered step",
                marks: ["strong", "em"],
              },
            ],
          },
        ],
      },
    }),
  );
  assert.match(html, /First line<br\s*\/>Second line/);
  assert.match(html, /<ul><li>First bullet<\/li><li>Second bullet<\/li><\/ul>/);
  assert.match(
    html,
    /<ol><li><strong><em>Numbered step<\/em><\/strong><\/li><\/ol>/,
  );
  assert.doesNotMatch(html, /<h2/);
});

test("cleared storage instructions remove sections and the entire empty guide", () => {
  assert.equal(
    renderToStaticMarkup(
      createElement(StorageGuide, {
        guide: {
          shortTermBody: plainTextToPortableText(" \n "),
          freezerBody: [],
        },
      }),
    ),
    "",
  );
  const html = renderToStaticMarkup(
    createElement(StorageGuide, { guide: { ovenTitle: "Title only" } }),
  );
  assert.match(html, /03<\/span><h2>Title only<\/h2>/);
  assert.doesNotMatch(html, /storage-guide-body/);
});
