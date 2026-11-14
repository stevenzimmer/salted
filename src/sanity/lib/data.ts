import "server-only";
import { cache } from "react";
import { fetchContent } from "./fetch-content";
import { GLOBAL_QUERY } from "./queries";
import { isSanityConfigured } from "../env";
import { mapProduct } from "./mappers";

export const getGlobalContent = cache(async () => {
  if (!isSanityConfigured)
    return { settings: null, commerce: null, products: [] };
  const data = await fetchContent(GLOBAL_QUERY);
  if (!data) return { settings: null, commerce: null, products: [] };
  return {
    ...data,
    // Email-only pickup details must not be serialized into storefront client props.
    commerce: data.commerce
      ? {
          ...data.commerce,
          orderEmail: data.commerce.orderEmail
            ? {
                openConfirmation: data.commerce.orderEmail.openConfirmation,
                openingConfirmation:
                  data.commerce.orderEmail.openingConfirmation,
                confirmationError: data.commerce.orderEmail.confirmationError,
              }
            : undefined,
        }
      : null,
    products: data.products.flatMap((product) => {
      const mapped = mapProduct(product);
      return mapped ? [mapped] : [];
    }),
  };
});
