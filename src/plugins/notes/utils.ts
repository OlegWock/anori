/////////
// Adapted from https://codesandbox.io/s/create-react-app-forked-h3rmcy?file=/src/sequentialNewlinePlugin.js:0-774
function enterLineEndingBlank(token: any) {
    this.enter(
        {
            type: "break",
            value: "",
            data: {},
            children: []
        },
        token
    );
}

function exitLineEndingBlank(token: any) {
    this.exit(token);
}

/**
 * MDAST utility for processing the lineEndingBlank token from micromark.
 */
const sequentialNewlinesFromMarkdown = {
    enter: {
        lineEndingBlank: enterLineEndingBlank
    },
    exit: {
        lineEndingBlank: exitLineEndingBlank
    }
};

export function sequentialNewlinesPlugin() {
    const data = this.data();

    function add(field: any, value: any) {
        const list = data[field] ? data[field] : (data[field] = []);

        list.push(value);
    }

    add("fromMarkdownExtensions", sequentialNewlinesFromMarkdown);
}
