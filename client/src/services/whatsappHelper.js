/**
 * Generates a WhatsApp API link pointing to the business WhatsApp number
 * with a custom pre-filled message based on the specified service.
 * 
 * @param {string} serviceName - The name of the service/design request
 * @returns {string} Fully constructed and encoded WhatsApp URL
 */
export const getWhatsAppLink = (serviceName) => {
  const businessNumber = '919666310391';
  const message = `Hello JP Creative Network, I'm interested in your ${serviceName}. Please share more details.`;
  return `https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`;
};
