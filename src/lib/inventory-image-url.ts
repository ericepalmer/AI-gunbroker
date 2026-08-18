/** Request a small GunBroker Cloudinary variant when we only have a full-size pix URL. */
export function inventoryThumbnailUrl(url: string): string {
  if (!url.includes("res.cloudinary.com/gunbroker")) return url;
  if (/\/w_\d+,h_\d+/.test(url)) return url;
  return url.replace(
    /^(https:\/\/res\.cloudinary\.com\/gunbroker[^/]+\/)/,
    "$1w_120,h_90,c_fit/",
  );
}
