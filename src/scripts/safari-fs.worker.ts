import { getIconsDirHandle } from "@utils/custom-icons";
import { SafariWorkerMessageIn, SafariWorkerMessageOut, TypedWorkerSelf } from "@utils/workers";

declare let self: TypedWorkerSelf<SafariWorkerMessageIn, SafariWorkerMessageOut>;

self.onmessage = async (message) => {
  console.log("Safari worker get a message!", message);
  if (message.data.type === "addCustomIcon") {
    console.log("Adding custom icon", message.data.filename);
    try {
      const iconsDir = await getIconsDirHandle();
      const fileHandle = await iconsDir.getFileHandle(message.data.filename, { create: true });
      const writeHandle = await fileHandle.createSyncAccessHandle();
      writeHandle.write(message.data.content);
      writeHandle.close();
      self.postMessage(
        {
          type: "addCustomIconResult",
          success: true,
          content: message.data.content,
          filename: message.data.filename,
        },
        [message.data.content],
      );
    } catch (err) {
      self.postMessage(
        {
          type: "addCustomIconResult",
          success: false,
          err: err.toString(),
          content: message.data.content,
          filename: message.data.filename,
        },
        [message.data.content],
      );
      return;
    }
  }
};
