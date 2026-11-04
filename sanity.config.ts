"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { projectId, dataset } from "./src/sanity/env";
import { schemaTypes } from "./src/sanity/schema";
import { singletonTitles } from "./src/sanity/schema/copy-fields";
import { structure } from "./src/sanity/structure";
import { resolve } from "./src/sanity/locations";

const singletons = new Set<string>(Object.keys(singletonTitles));
export default defineConfig({
  name: "salted",
  title: "Salted Focaccia",
  projectId,
  dataset,
  basePath: "/studio",
  plugins: [
    presentationTool({
      resolve,
      previewUrl: {
        initial: "/",
        previewMode: {
          enable: "/api/draft-mode/enable",
          disable: "/api/draft-mode/disable",
        },
      },
    }),
    structureTool({ structure }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((template) => !singletons.has(template.schemaType)),
  },
  document: {
    newDocumentOptions: (options) =>
      options.filter((option) => !singletons.has(option.templateId)),
    actions: (actions, context) =>
      singletons.has(context.schemaType)
        ? actions.filter(
            (action) =>
              !["delete", "duplicate", "unpublish"].includes(
                action.action || "",
              ),
          )
        : actions,
  },
});
