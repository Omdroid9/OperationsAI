/** Public marketing contact — override via NEXT_PUBLIC_SKYOS_CONTACT_* in production. */
export function getMarketingContact() {
  const email =
    process.env.NEXT_PUBLIC_SKYOS_CONTACT_EMAIL?.trim() || "hello@skyos.example";
  const phone = process.env.NEXT_PUBLIC_SKYOS_CONTACT_PHONE?.trim() || null;

  return {
    email,
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null,
  };
}
