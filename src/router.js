export function parseRoute(pathname, appRootPath, localePages, currencyCodes) {
  const root = appRootPath.endsWith("/") ? appRootPath : `${appRootPath}/`;
  const relative = pathname.startsWith(root) ? pathname.slice(root.length) : "";
  const segments = relative.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  const localePage = localePages.find(({ path }) => path && path.toLowerCase() === segments[0]?.toLowerCase());
  const currencySegments = localePage ? segments.slice(1) : segments;
  const currencies = [...new Set(currencySegments.map((code) => code.toUpperCase()).filter((code) => currencyCodes.includes(code)))];
  return { localePage, currencies };
}

export function buildRoute(appRootUrl, localePath, currencies) {
  const language = localePath || "en";
  const currencyPath = currencies.map((code) => code.toLowerCase()).join("/");
  return new URL(`${language}/${currencyPath}${currencyPath ? "/" : ""}`, appRootUrl).href;
}
