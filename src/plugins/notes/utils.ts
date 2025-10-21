/////////
// Adapted from https://codesandbox.io/s/create-react-app-forked-h3rmcy?file=/src/sequentialNewlinePlugin.js:0-774
// biome-ignore lint/suspicious/noExplicitAny: Original code wasn't typed and I have no idea how to type it correctly, so leaving it as isolated chaos
type LegalAny = any;
function enterLineEndingBlank(token: LegalAny) {
  this.enter(
    {
      type: "break",
      value: "",
      data: {},
      children: [],
    },
    token,
  );
}

function exitLineEndingBlank(token: LegalAny) {
  this.exit(token);
}

/**
 * MDAST utility for processing the lineEndingBlank token from micromark.
 */
const sequentialNewlinesFromMarkdown = {
  enter: {
    lineEndingBlank: enterLineEndingBlank,
  },
  exit: {
    lineEndingBlank: exitLineEndingBlank,
  },
};

export function sequentialNewlinesPlugin() {
  const data = this.data();

  function add(field: LegalAny, value: LegalAny) {
    if (!data[field]) {
      data[field] = [];
    }

    data[field].push(value);
  }

  add("fromMarkdownExtensions", sequentialNewlinesFromMarkdown);
}
