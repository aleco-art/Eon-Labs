export const siteConfig = {
  name: "Eon Labs",
  url: import.meta.env.VITE_SITE_URL?.trim() ?? "",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER?.trim() ?? "",
  email: import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? "",
};
