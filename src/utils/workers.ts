export type SafariWorkerMessageIn = {
  type: "addCustomIcon";
  content: ArrayBuffer;
  filename: string;
};

export type SafariWorkerMessageOut = {
  type: "addCustomIconResult";
  success: boolean;
  filename: string;
  content: ArrayBuffer;
  err?: string;
};

export type TypedWorker<MI, MO> = Omit<Worker, "postMessage"> & {
  postMessage: (mes: MI, tranferables?: Transferable[]) => void;
  addEventListener: (event: "message", handler: (message: MessageEvent<MO>) => void) => void;
};

export type TypedWorkerSelf<MI, MO> = Omit<DedicatedWorkerGlobalScope, "onmessage" | "postMessage"> & {
  postMessage: (mes: MO, tranferables?: Transferable[]) => void;
  onmessage: (message: MessageEvent<MI>) => void;
};

const createWorker = <MI = never, MO = never>(script: string): TypedWorker<MI, MO> => {
  const worker = new Worker(script);

  return worker;
};

export const createSafariFsWorker = () =>
  createWorker<SafariWorkerMessageIn, SafariWorkerMessageOut>("/scripts/safari-fs.worker.js");
