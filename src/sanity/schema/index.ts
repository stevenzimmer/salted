import { defineArrayMember, defineField, defineType } from "sanity";
import { copyFields, singletonTitles } from "./copy-fields";
import { MAX_NAVIGATION_ITEMS, navigationHref } from "../../lib/navigation";
import { hasText } from "../lib/content";
import { apiVersion } from "../env";
import { pickupDayInput } from "../../lib/pickup-policy";
import { imageDescription, validateImageAssetSize } from "./image-rules";
import {
  LimitedImageArrayInput,
  LimitedImageInput,
} from "../components/image-upload-input";

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
const image = (name: string, dimensions: string) =>
  defineField({
    name,
    title: title(name),
    type: "imageWithAlt",
    description: imageDescription(dimensions),
  });
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

const productFilters = defineField({
  name: "filters",
  title: "Product filters",
  type: "array",
  options: { sortable: true },
  description:
    "Add, remove or drag to reorder filters. The first visible filter is selected by default. An empty list shows all products.",
  of: [
    defineArrayMember({
      name: "productFilter",
      title: "Product filter",
      type: "object",
      fields: [
        defineField({ name: "label", title: "Label", type: "string" }),
        defineField({
          name: "showAll",
          title: "Show all products",
          type: "boolean",
          initialValue: false,
        }),
        defineField({
          name: "category",
          title: "Category",
          type: "reference",
          to: [{ type: "productCategory" }],
          hidden: ({ parent }) => parent?.showAll === true,
          validation: (rule) =>
            rule.custom((value, context) =>
              (context.parent as { showAll?: boolean } | undefined)?.showAll ===
                true || value?._ref
                ? true
                : "Choose a category or show all products.",
            ),
        }),
      ],
      preview: { select: { title: "label", subtitle: "category.title" } },
    }),
  ],
});

const objects = [
  defineType({
    name: "navigationItem",
    title: "Navigation item",
    type: "object",
    fields: [
      defineField({ name: "label", title: "Menu text", type: "string" }),
      defineField({
        name: "href",
        title: "Link",
        type: "string",
        description:
          "Use a page path (/recipes), an anchor (/#products or #products), a full https:// link, mailto: or tel:.",
        validation: (rule) =>
          rule.custom((value) =>
            !hasText(value) || navigationHref(value)
              ? true
              : "Enter a valid page path, anchor, web, email or telephone link.",
          ),
      }),
    ],
    preview: { select: { title: "label", subtitle: "href" } },
  }),
  defineType({
    name: "imageWithAlt",
    title: "Image",
    type: "image",
    options: { hotspot: true },
    description: imageDescription("1600 × 1200 px (4:3)"),
    components: { input: LimitedImageInput },
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
    validation: (r) => [
      r.custom((value) =>
        !value?.asset ||
        value.decorative ||
        (typeof value.alt === "string" && value.alt.trim())
          ? true
          : "Add useful alternative text or mark this image decorative.",
      ),
      r.custom((value, context) =>
        validateImageAssetSize(value, (ref) =>
          context
            .getClient({ apiVersion })
            .withConfig({ useCdn: false })
            .getDocument<{ size?: number }>(ref),
        ),
      ),
    ],
  }),
  defineType({
    name: "seo",
    title: "Search & social",
    type: "object",
    fields: [
      text("title"),
      text("description"),
      image("image", "1200 × 630 px for social sharing"),
    ],
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
        title: "Stable size / variant key",
        type: "string",
        description:
          "Keep this key stable so existing carts and orders continue to identify this size.",
        validation: (r) => r.required().regex(/^[a-z0-9-]+$/),
      }),
      text("label"),
      text("shortLabel"),
      text("dimensions"),
      text("servingDescription"),
      image("image", "1200 × 1500 px (4:5 portrait)"),
      defineField({
        name: "price",
        title: "Price (US cents)",
        type: "number",
        validation: (r) => r.required().integer().min(0).max(10000000),
      }),
      defineField({
        ...active,
        description:
          "Publish this size as active to offer it on every open pickup Friday. Turn it off to remove it from the menu.",
      }),
    ],
    preview: { select: { title: "label", subtitle: "id", media: "image" } },
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
      image("image", "1200 × 1200 px (1:1 square)"),
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
    fieldsets:
      name === "siteSettings"
        ? [
            {
              name: "announcementBar",
              title: "Announcement bar",
              options: { collapsible: true, collapsed: false },
            },
          ]
        : undefined,
    fields: [
      internalName,
      ...(name === "pickupPage"
        ? [
            defineField({
              name: "blackoutDates",
              title: "Pickup blackout dates",
              type: "array",
              description:
                "All future Fridays are available before the Wednesday Pacific cutoff. Add Fridays here to close them, then publish. Clear a date to reopen it. Existing checkouts and orders keep their pickup commitment.",
              of: [
                defineArrayMember({
                  type: "date",
                  options: { dateFormat: "YYYY-MM-DD" },
                  validation: (rule) =>
                    rule
                      .required()
                      .custom(
                        (value) =>
                          pickupDayInput.safeParse(value).success ||
                          "Choose a valid Friday.",
                      ),
                }),
              ],
              validation: (rule) => rule.max(500).unique(),
            }),
          ]
        : []),
      ...Object.entries(groups).flatMap(([group, fields]) => {
        const isAnnouncement =
          name === "siteSettings" && group === "announcement";
        const content = defineField({
          name: group,
          title: isAnnouncement ? "Message" : title(group),
          type: "object",
          fieldset: isAnnouncement ? "announcementBar" : undefined,
          fields: fields.map((field: string) =>
            name === "commerceCopy" &&
            group === "orderEmail" &&
            field === "pickupDirectionsUrl"
              ? defineField({
                  name: field,
                  title: title(field),
                  type: "url",
                  validation: (rule) => rule.uri({ scheme: ["https"] }),
                })
              : name === "commerceCopy" &&
                  group === "product" &&
                  field === "filters"
                ? productFilters
                : name === "commerceCopy" && group === "marketingConsent"
                  ? defineField({
                      ...text(field),
                      description:
                        "Optional newsletter checkbox wording. Clearing it removes the signup option. The checkbox always starts unchecked.",
                      validation: (rule) => rule.max(2000),
                    })
                  : text(field),
          ),
        });
        return isAnnouncement
          ? [
              defineField({
                name: "announcementEnabled",
                title: "Show announcement bar",
                type: "boolean",
                fieldset: "announcementBar",
                initialValue: true,
              }),
              content,
            ]
          : [content];
      }),
      ...(name === "siteSettings"
        ? [
            ...(["headerNavigation", "footerNavigation"] as const).map(
              (field) =>
                defineField({
                  name: field,
                  title:
                    field === "headerNavigation"
                      ? "Header navigation"
                      : "Footer navigation",
                  type: "array",
                  of: [{ type: "navigationItem" }],
                  options: { sortable: true },
                  description:
                    field === "headerNavigation"
                      ? "Add up to seven items for the desktop header and mobile menu. Drag to change their order."
                      : "Add up to seven footer menu items. Drag to change their order.",
                  validation: (rule) =>
                    rule
                      .max(MAX_NAVIGATION_ITEMS)
                      .error("Navigation can contain at most seven items."),
                }),
            ),
            image("footerImage", "400 × 400 px (1:1 square)"),
          ]
        : []),
      ...(name === "homepage"
        ? [
            image("heroImage", "1600 × 1200 px (4:3)"),
            references("featuredRecipes", "recipe"),
            references("featuredReviews", "review"),
            defineField({
              name: "instagramPhotos",
              type: "array",
              of: [{ type: "instagramPhoto" }],
            }),
          ]
        : []),
      ...(name === "aboutPage"
        ? [image("image", "1200 × 1440 px (5:6 portrait)")]
        : []),
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
    name: "productCategory",
    title: "Product category",
    type: "document",
    description:
      "Create and rename categories here. Reassign products and remove filter references before deleting a category.",
    fields: [
      internalName,
      defineField({ name: "title", title: "Category name", type: "string" }),
    ],
    preview: {
      select: { title: "title", internal: "internalName" },
      prepare: ({ title, internal }) => ({ title: title || internal }),
    },
  }),
  defineType({
    name: "product",
    title: "Product",
    type: "document",
    fields: [
      internalName,
      defineField({
        name: "id",
        title: "Stable product identity",
        type: "string",
        description:
          "Keep this identity stable for existing carts and order history.",
        validation: (r) => r.required().regex(/^[a-z0-9-]+$/),
      }),
      slug,
      defineField({
        name: "category",
        type: "reference",
        to: [{ type: "productCategory" }],
        validation: (r) => r.required(),
      }),
      defineField({
        name: "tier",
        title: "Pricing tier",
        type: "string",
        options: { list: ["classic", "specialty"] },
        validation: (r) => r.required(),
      }),
      defineField({
        ...active,
        description:
          "Inactive products are hidden from the storefront and cannot be added to a bag. Their product pages remain available with the inactive product message from Commerce copy.",
      }),
      order,
      text("displayName"),
      text("eyebrow"),
      text("badge"),
      text("shortDescription"),
      text("description"),
      text("servingDescription"),
      text("storageSummary"),
      text("reheatingSummary"),
      image("image", "1200 × 1500 px (4:5 portrait)"),
      defineField({
        name: "gallery",
        type: "array",
        description: imageDescription("1200 × 1200 px (1:1 square)"),
        components: { input: LimitedImageArrayInput },
        of: [
          defineArrayMember({
            type: "imageWithAlt",
            description: imageDescription("1200 × 1200 px (1:1 square)"),
          }),
        ],
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
              : "Size / variant keys must be unique.";
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
        subtitle: "category.title",
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
      image(
        "image",
        "1600 × 800 px (2:1 landscape); keep the subject centered for cropped recipe cards",
      ),
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
