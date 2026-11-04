import type { StructureResolver } from "sanity/structure";
import { singletonTitles } from "./schema/copy-fields";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Salted Focaccia")
    .items([
      ...(
        [
          "homepage",
          "product",
          "recipe",
          "review",
          "pickupPage",
          "specialOrdersPage",
          "aboutPage",
          "storageHeatingPage",
          "recipesPage",
          "privacyPage",
          "termsPage",
          "commerceCopy",
          "siteSettings",
        ] as const
      ).map((type) => {
        if (type === "product" || type === "recipe" || type === "review")
          return S.documentTypeListItem(type).title(
            { product: "Products", recipe: "Recipes", review: "Reviews" }[type],
          );
        return S.listItem()
          .title(singletonTitles[type])
          .id(type)
          .child(
            S.document()
              .schemaType(type)
              .documentId(type)
              .title(singletonTitles[type]),
          );
      }),
    ]);
