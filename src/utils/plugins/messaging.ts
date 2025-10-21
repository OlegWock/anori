import type { OnMessageDescriptor } from "@anori/utils/plugins/types";
import type { Mapping } from "@anori/utils/types";
import browser from "webextension-polyfill";

export const createOnMessageHandlers = <T extends { [key in string]: OnMessageDescriptor<Mapping, unknown> }>(
  pluginId: string,
  handlers: { [K in keyof T]: (args: T[K]["args"], senderTab?: number) => Promise<T[K]["result"]> },
) => {
  return {
    handlers,
    sendMessage: <K extends keyof T>(command: K, args: T[K]["args"]): Promise<T[K]["result"]> => {
      const message = {
        type: "plugin-command",
        pluginId,
        command,
        args,
      };
      return browser.runtime.sendMessage(message);
    },
  };
};
