export type HlcTimestamp = {
  pt: number;
  lc: number;
  node: string;
};

export type HlcState = {
  nodeId: string;
  last: HlcTimestamp;
};

export type Hlc = {
  nodeId: string;
  last: HlcTimestamp;
  tick: () => HlcTimestamp;
  receive: (remote: HlcTimestamp) => void;
  getState: () => HlcState;
};

export function generateNodeId(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createHlc(nodeId: string, lastTimestamp?: HlcTimestamp): Hlc {
  const hlc: Hlc = {
    nodeId,
    last: lastTimestamp ?? { pt: 0, lc: 0, node: nodeId },

    tick(): HlcTimestamp {
      const now = Date.now();
      if (now > this.last.pt) {
        this.last = { pt: now, lc: 0, node: this.nodeId };
      } else {
        this.last = { pt: this.last.pt, lc: this.last.lc + 1, node: this.nodeId };
      }
      return { ...this.last };
    },

    receive(remote: HlcTimestamp): void {
      const now = Date.now();
      const maxPt = Math.max(now, this.last.pt, remote.pt);

      if (maxPt === this.last.pt && maxPt === remote.pt) {
        this.last = {
          pt: maxPt,
          lc: Math.max(this.last.lc, remote.lc) + 1,
          node: this.nodeId,
        };
      } else if (maxPt === this.last.pt) {
        this.last = {
          pt: maxPt,
          lc: this.last.lc + 1,
          node: this.nodeId,
        };
      } else if (maxPt === remote.pt) {
        this.last = {
          pt: maxPt,
          lc: remote.lc + 1,
          node: this.nodeId,
        };
      } else {
        this.last = {
          pt: maxPt,
          lc: 0,
          node: this.nodeId,
        };
      }
    },

    getState(): HlcState {
      return {
        nodeId: this.nodeId,
        last: { ...this.last },
      };
    },
  };

  return hlc;
}

/**
 * Compares two HLC timestamps.
 * @returns 1 if `a` is newer than `b`, -1 if `a` is older than `b`, 0 if equal
 */
export function compareHlc(a: HlcTimestamp, b: HlcTimestamp): -1 | 0 | 1 {
  if (a.pt !== b.pt) {
    return a.pt > b.pt ? 1 : -1;
  }
  if (a.lc !== b.lc) {
    return a.lc > b.lc ? 1 : -1;
  }
  if (a.node !== b.node) {
    return a.node > b.node ? 1 : -1;
  }
  return 0;
}

export function serializeHlc(ts: HlcTimestamp): string {
  return `${ts.pt.toString(36)}-${ts.lc.toString(36)}-${ts.node}`;
}

export function deserializeHlc(str: string): HlcTimestamp {
  const [ptStr, lcStr, node] = str.split("-");
  return {
    pt: Number.parseInt(ptStr, 36),
    lc: Number.parseInt(lcStr, 36),
    node,
  };
}
