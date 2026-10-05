const { createRequire } = require("node:module");

const pandaModule = createRequire(require.resolve("@pandacss/dev/postcss"))("@pandacss/postcss");

const pandaFileDependencies = () => ({
  postcssPlugin: "panda-file-dependencies",
  OnceExit(_root, { result }) {
    const context = pandaModule.builder.context;
    if (!context) return;
    for (const file of context.getFiles()) {
      result.messages.push({ type: "dependency", plugin: "panda-file-dependencies", file, parent: result.opts.from });
    }
  },
});
pandaFileDependencies.postcss = true;

module.exports = {
  plugins: [pandaModule.default(), pandaFileDependencies()],
};
