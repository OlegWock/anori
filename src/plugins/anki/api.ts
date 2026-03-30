import type { Mapping } from "@anori/utils/types";
import type { AnkiCardInfo } from "./types";

export const callAnkiConnectApi = async <T = void>(action: string, version: number, params?: Mapping): Promise<T> => {
  try {
    const response = await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, version, params }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch");
    }
    const data = await response.json();

    if (!data || !(typeof data === "object") || !("error" in data) || !("result" in data)) {
      throw new Error("Response has an unexpected structure");
    }

    if (data.error) {
      throw new Error(String(data.error));
    }

    return data.result as T;
  } catch (error) {
    throw new Error(`Failed to issue request: ${error.message}`);
  }
};

export const wrapCardHtml = (html: string) => {
  return `
    <style>
        html, body {
            height: 100%;
            box-sizing: border-box;
        }
        body {
            margin: 0;
        }
        .card {
            min-height: 100%;
            box-sizing: border-box;
            padding: 16px;
        }
    </style>
    <div class="card">
        ${html}
    </div>`;
};

export const getCardInfo = async (cardId: number): Promise<AnkiCardInfo> => {
  const data = await callAnkiConnectApi<AnkiCardInfo[]>("cardsInfo", 6, {
    cards: [cardId],
  });
  return data[0];
};

export const checkAnkiConnectivity = async () => {
  try {
    await callAnkiConnectApi("version", 6);
    return true;
  } catch (_e) {
    return false;
  }
};
