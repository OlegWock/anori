// @ts-ignore No types for this module
import { connectToDevTools, initialize } from "react-devtools-core/backend";
console.log("Initializing react-devtools backend. Don't forget to start frontend with\n\n $ yarn run react-devtools");
initialize();
connectToDevTools();
