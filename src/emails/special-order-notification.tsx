import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";
import type { SpecialOrdersPage } from "../../sanity.types";
import { hasText } from "../sanity/lib/content";

export type SpecialOrderNotificationProps = {
  request: {
    id: string;
    name: string;
    email: string;
    phone: string;
    requestedDate: string;
    products: string;
    marketingOptIn: boolean;
    marketingConsentText: string | null;
  };
  copy?: SpecialOrdersPage["notificationEmail"];
};

export function SpecialOrderNotificationEmail({
  request,
  copy,
}: SpecialOrderNotificationProps) {
  const details = [
    { label: copy?.nameLabel, value: request.name },
    { label: copy?.emailLabel, value: request.email },
    { label: copy?.phoneLabel, value: request.phone },
    { label: copy?.dateLabel, value: request.requestedDate },
    { label: copy?.productsLabel, value: request.products },
    { label: copy?.consentLabel, value: String(request.marketingOptIn) },
  ];
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Body className="m-0 bg-[#faf3e7] px-4 py-8 font-serif text-[#292521]">
          <Preview>{request.id}</Preview>
          <Container className="mx-auto max-w-[560px]">
            {hasText(copy?.heading) ? (
              <Heading as="h1" className="text-3xl font-normal">
                {copy.heading}
              </Heading>
            ) : null}
            <Text className="text-xs text-[#945c39]">{request.id}</Text>
            {details.map(({ label, value }, index) => (
              <Section key={index}>
                {hasText(label) ? (
                  <Heading as="h2" className="mb-1 text-base font-normal">
                    {label}
                  </Heading>
                ) : null}
                <Text className="mt-0 whitespace-pre-wrap break-words text-sm leading-6">
                  {value}
                </Text>
              </Section>
            ))}
            {request.marketingConsentText ? (
              <Text className="text-xs leading-5">
                {request.marketingConsentText}
              </Text>
            ) : null}
            {hasText(copy?.footer) ? (
              <Text className="text-sm leading-6">{copy.footer}</Text>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
