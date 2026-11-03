import { defineArrayMember, defineField, defineType } from "sanity";
import { copyFields, singletonTitles } from "./copy-fields";

const title = (value: string) =>
  value.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const text = (name: string) =>
  defineField({ name, title: title(name), type: "text", rows: 3 });
const strings = (name: string) =>
  defineField({
    name,
    title: title(name),
    type: "array",
    of: [{ type: "string" }],
  });
const image = (name: string) =>
  defineField({ name, title: title(name), type: "imageWithAlt" });
const references = (name: string, type: string) =>
  defineField({
    name,
    title: title(name),
    type: "array",
    of: [{ type: "reference", to: [{ type }] }],
  });
const internalName = defineField({
  name: "internalName",
  title: "Internal name (Studio only)",
  type: "string",
  validation: (r) => r.required(),
});
const seoField = defineField({
  name: "seo",
  title: "Search & social",
  type: "seo",
});
const order = defineField({
  name: "displayOrder",
  title: "Display order",
  type: "number",
  validation: (r) => r.integer(),
});
const active = defineField({
  name: "active",
  type: "boolean",
  initialValue: true,
});
const slug = defineField({
  name: "slug",
  type: "slug",
  options: { source: "internalName" },
  validation: (r) => r.required(),
});

const objects = [
  defineType({
    name: "imageWithAlt",
    title: "Image",
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({
        name: "alt",
        title: "Alternative text",
        type: "string",
        description: "Describe the image for someone who cannot see it.",
      }),
      defineField({
        name: "decorative",
        title: "Decorative image",
        type: "boolean",
        initialValue: false,
      }),
      text("caption"),
    ],
    validation: (r) =>
      r.custom((value) =>
        !value?.asset ||
        value.decorative ||
        (typeof value.alt === "string" && value.alt.trim())
          ? true
          : "Add useful alternative text or mark this image decorative.",
      ),
  }),
  defineType({
    name: "seo",
    title: "Search & social",
    type: "object",
    fields: [text("title"), text("description"), image("image")],
  }),
  defineType({
    name: "portableText",
    title: "Body",
    type: "array",
    of: [
      defineArrayMember({
        type: "block",
        styles: [
          { title: "Paragraph", value: "normal" },
          { title: "Heading", value: "h2" },
          { title: "Subheading", value: "h3" },
        ],
        lists: [
          { title: "Bullets", value: "bullet" },
          { title: "Numbered", value: "number" },
        ],
        marks: {
          decorators: [
            { title: "Bold", value: "strong" },
            { title: "Italic", value: "em" },
          ],
          annotations: [
            {
              name: "link",
              type: "object",
              fields: [
                defineField({
                  name: "href",
                  type: "url",
                  validation: (r) =>
                    r.uri({
                      scheme: ["http", "https", "mailto"],
                      allowRelative: true,
                    }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  }),
  defineType({
    name: "productVariant",
    title: "Size / variant",
    type: "object",
    fields: [
      defineField({
        name: "id",
        title: "Stable inventory key",
        type: "string",
        description:
          "Keep existing keys: round, square, pan, or loaf. New keys have no preview inventory.",
        validation: (r) => r.required().regex(/^[a-z0-9-]+$/),
      }),
      text("label"),
      text("shortLabel"),
      text("dimensions"),
      text("servingDescription"),
      defineField({
        name: "price",
        title: "Price (US cents)",
        type: "number",
        validation: (r) => r.required().integer().min(0).max(10000000),
      }),
      active,
    ],
    preview: { select: { title: "label", subtitle: "id" } },
  }),
  defineType({
    name: "recipeIngredientGroup",
    title: "Ingredient group",
    type: "object",
    fields: [text("heading"), strings("ingredients")],
  }),
  defineType({
    name: "recipeStep",
    title: "Instruction",
    type: "object",
    fields: [text("heading"), text("body")],
  }),
  defineType({
    name: "instagramPhoto",
    title: "Instagram photo",
    type: "object",
    fields: [
      image("image"),
      defineField({
        name: "permalink",
        type: "url",
        validation: (r) => r.uri({ scheme: ["https"] }),
      }),
    ],
    preview: { select: { title: "image.alt", media: "image" } },
  }),
];

const singletons = Object.entries(copyFields).map(([name, groups]) =>
  defineType({
    name,
    title: singletonTitles[name as keyof typeof singletonTitles],
    type: "document",
    fields: [
      internalName,
      ...Object.entries(groups).map(([group, fields]) =>
        defineField({
          name: group,
          title: title(group),
          type: "object",
          fields: fields.map(text),
        }),
      ),
      ...(name === "siteSettings"
        ? [
            defineField({
              name: "announcementEnabled",
              type: "boolean",
              initialValue: true,
            }),
            image("footerImage"),
          ]
        : []),
      ...(name === "homepage"
        ? [
            image("heroImage"),
            references("featuredRecipes", "recipe"),
            references("featuredReviews", "review"),
            defineField({
              name: "instagramPhotos",
              type: "array",
              of: [{ type: "instagramPhoto" }],
            }),
          ]
        : []),
      ...(name === "aboutPage" ? [image("image")] : []),
      ...(name === "privacyPage" || name === "termsPage"
        ? [
            text("updatedText"),
            defineField({ name: "body", type: "portableText" }),
          ]
        : []),
      seoField,
    ],
    preview: { select: { title: "internalName" } },
  }),
);

export const schemaTypes = [
  ...objects,
  ...singletons,
  defineType({
    name: "product",
    title: "Product",
    type: "document",
    fields: [
      internalName,
      defineField({
        name: "id",
        title: "Stable inventory identity",
        type: "string",
        description:
          "Changing this breaks existing browser carts. Inventory stays in code until the commerce phase.",
        validation: (r) => r.required().regex(/^[a-z0-9-]+$/),
      }),
      slug,
      defineField({
        name: "category",
        type: "string",
        options: { list: ["focaccia", "sourdough"] },
        validation: (r) => r.required(),
      }),
      defineField({
        name: "tier",
        title: "Pricing tier",
        type: "string",
        options: { list: ["classic", "specialty"] },
        validation: (r) => r.required(),
      }),
      active,
      order,
      text("displayName"),
      text("eyebrow"),
      text("badge"),
      text("shortDescription"),
      text("description"),
      text("servingDescription"),
      text("storageSummary"),
      text("reheatingSummary"),
      image("image"),
      defineField({
        name: "gallery",
        type: "array",
        of: [{ type: "imageWithAlt" }],
      }),
      strings("ingredients"),
      strings("allergens"),
      strings("dietaryLabels"),
      defineField({
        name: "variants",
        type: "array",
        of: [{ type: "productVariant" }],
        validation: (r) =>
          r.custom((value) => {
            const ids = value?.map((v) =>
              typeof v === "object" && v !== null && "id" in v
                ? v.id
                : undefined,
            );
            return !ids || new Set(ids).size === ids.length
              ? true
              : "Variant inventory keys must be unique.";
          }),
      }),
      references("relatedRecipes", "recipe"),
      references("relatedProducts", "product"),
      seoField,
    ],
    preview: {
      select: {
        displayed: "displayName",
        internal: "internalName",
        subtitle: "category",
        media: "image",
      },
      prepare: ({ displayed, internal, subtitle, media }) => ({
        title: displayed || internal,
        subtitle,
        media,
      }),
    },
  }),
  defineType({
    name: "recipe",
    title: "Recipe",
    type: "document",
    fields: [
      internalName,
      slug,
      active,
      order,
      text("displayTitle"),
      text("description"),
      image("image"),
      defineField({ name: "introduction", type: "portableText" }),
      ...["prepMinutes", "cookMinutes", "totalMinutes"].map((name) =>
        defineField({
          name,
          title: title(name),
          type: "number",
          validation: (r) => r.integer().min(0),
        }),
      ),
      text("servings"),
      defineField({
        name: "ingredientGroups",
        type: "array",
        of: [{ type: "recipeIngredientGroup" }],
      }),
      defineField({
        name: "steps",
        type: "array",
        of: [{ type: "recipeStep" }],
      }),
      defineField({ name: "notes", type: "portableText" }),
      strings("tags"),
      references("relatedProducts", "product"),
      seoField,
    ],
    preview: {
      select: {
        displayed: "displayTitle",
        internal: "internalName",
        media: "image",
      },
      prepare: ({ displayed, internal, media }) => ({
        title: displayed || internal,
        media,
      }),
    },
  }),
  defineType({
    name: "review",
    title: "Review",
    type: "document",
    fields: [
      internalName,
      text("heading"),
      text("quote"),
      text("customerName"),
      text("customerDetail"),
      active,
      order,
    ],
    preview: { select: { title: "customerName", subtitle: "quote" } },
  }),
];
