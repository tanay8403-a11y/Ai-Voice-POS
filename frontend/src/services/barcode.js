import api from "./api";

/**
 * Look up a product by barcode or SKU.
 */
export async function lookupByBarcode(barcode) {
  const response = await api.post("/products/barcode", {
    barcode,
  });

  return response.data;
}

/**
 * Generate barcode image for a product.
 */
export async function generateBarcode(productId) {
  const response = await api.get(`/inventory/barcode/${productId}`, {
    responseType: "blob",
  });

  return response.data;
}

/**
 * Generate QR code for a product.
 */
export async function generateQRCode(productId) {
  const response = await api.get(`/inventory/qr/${productId}`, {
    responseType: "blob",
  });

  return response.data;
}

/**
 * Get barcode image URL for displaying in img tag.
 */
export function getBarcodeImageUrl(productId) {
  return `${api.defaults.baseURL}/inventory/barcode/${productId}`;
}

/**
 * Get QR image URL for displaying in img tag.
 */
export function getQrImageUrl(productId) {
  return `${api.defaults.baseURL}/inventory/qr/${productId}`;
}