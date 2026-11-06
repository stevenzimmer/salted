import assert from "node:assert/strict";
import test from "node:test";
import {
  IMAGE_SIZE_ERROR,
  imageSizeValidation,
  validateImageAssetSize,
} from "../src/sanity/schema/image-rules";

const image = {
  asset: { _type: "reference" as const, _ref: "image-example-1600x1200-jpg" },
};

test("images must be strictly below 400,000 bytes", () => {
  assert.equal(imageSizeValidation(399_999), true);
  assert.equal(imageSizeValidation(400_000), IMAGE_SIZE_ERROR);
  assert.equal(imageSizeValidation(409_600), IMAGE_SIZE_ERROR);
  for (const size of [undefined, 0, -1, NaN, Infinity]) {
    assert.notEqual(imageSizeValidation(size), true);
  }
});

test("cleared optional images do not request asset metadata", async () => {
  for (const value of [undefined, {}]) {
    assert.equal(
      await validateImageAssetSize(value, async () => {
        assert.fail("Empty image fields must remain optional");
      }),
      true,
    );
  }
});

test("selected existing assets use stored file size, including oversized assets", async () => {
  assert.equal(
    await validateImageAssetSize(image, async (id) => {
      assert.equal(id, image.asset._ref);
      return { size: 399_999 };
    }),
    true,
  );
  assert.equal(
    await validateImageAssetSize(image, async () => ({ size: 400_000 })),
    IMAGE_SIZE_ERROR,
  );
  for (const asset of [undefined, {}]) {
    assert.notEqual(
      await validateImageAssetSize(image, async () => asset),
      true,
    );
  }
});

test("asset lookup failures produce an actionable validation error", async () => {
  const result = await validateImageAssetSize(image, async () => {
    throw new Error("Offline");
  });
  assert.match(String(result), /Check your connection/);
});
