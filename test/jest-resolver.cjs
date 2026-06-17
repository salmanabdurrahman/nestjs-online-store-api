// Custom jest resolver: when importer lives in src/generated/ and request is
// a relative .js path, try resolving the .ts source first. This is needed
// because Prisma 7's `prisma-client` generator emits .ts files with .ts in
// their import statements; tsc rewrites those to .js during emit, but in
// the test pipeline no .js files exist on disk for src/generated/*.
const path = require("node:path");

const GENERATED_DIR = `${path.sep}generated${path.sep}`;

module.exports = (request, options) => {
  const isRelativeJs = request.startsWith("./") || request.startsWith("../");
  const importerInGenerated =
    typeof options.basedir === "string" &&
    options.basedir.includes(GENERATED_DIR);

  if (isRelativeJs && importerInGenerated && request.endsWith(".js")) {
    const tsRequest = request.slice(0, -3) + ".ts";
    try {
      return options.defaultResolver(tsRequest, options);
    } catch {
      // fall through to default resolver
    }
  }

  return options.defaultResolver(request, options);
};
