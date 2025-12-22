import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type HlcTimestamp, compareHlc, createHlc, deserializeHlc, serializeHlc } from "../hlc";

describe("HLC", () => {
  describe("createHlc", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should create HLC with given node ID", () => {
      const hlc = createHlc("node1");
      expect(hlc.nodeId).toBe("node1");
      expect(hlc.last).toEqual({ pt: 0, lc: 0, node: "node1" });
    });

    it("should generate timestamp with current time on tick", () => {
      vi.setSystemTime(1000);
      const hlc = createHlc("node1");

      const ts = hlc.tick();

      expect(ts.pt).toBe(1000);
      expect(ts.lc).toBe(0);
      expect(ts.node).toBe("node1");
    });

    it("should increment logical counter when time hasn't advanced", () => {
      vi.setSystemTime(1000);
      const hlc = createHlc("node1");

      const ts1 = hlc.tick();
      const ts2 = hlc.tick();
      const ts3 = hlc.tick();

      expect(ts1).toEqual({ pt: 1000, lc: 0, node: "node1" });
      expect(ts2).toEqual({ pt: 1000, lc: 1, node: "node1" });
      expect(ts3).toEqual({ pt: 1000, lc: 2, node: "node1" });
    });

    it("should reset logical counter when time advances", () => {
      vi.setSystemTime(1000);
      const hlc = createHlc("node1");

      hlc.tick();
      hlc.tick();

      vi.setSystemTime(2000);
      const ts = hlc.tick();

      expect(ts).toEqual({ pt: 2000, lc: 0, node: "node1" });
    });

    it("should handle clock going backward", () => {
      vi.setSystemTime(2000);
      const hlc = createHlc("node1");

      hlc.tick();

      vi.setSystemTime(1000);
      const ts = hlc.tick();

      expect(ts.pt).toBe(2000);
      expect(ts.lc).toBe(1);
    });
  });

  describe("receive", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should update HLC when receiving newer remote timestamp", () => {
      vi.setSystemTime(1000);
      const hlc = createHlc("node1");

      hlc.receive({ pt: 2000, lc: 5, node: "node2" });

      expect(hlc.last.pt).toBe(2000);
      expect(hlc.last.lc).toBe(6);
      expect(hlc.last.node).toBe("node1");
    });

    it("should use local time when it's newest", () => {
      vi.setSystemTime(3000);
      const hlc = createHlc("node1");

      hlc.receive({ pt: 2000, lc: 5, node: "node2" });

      expect(hlc.last.pt).toBe(3000);
      expect(hlc.last.lc).toBe(0);
    });

    it("should merge logical counters when physical times match", () => {
      vi.setSystemTime(1000);
      const hlc = createHlc("node1");

      hlc.tick();
      hlc.tick();

      hlc.receive({ pt: 1000, lc: 5, node: "node2" });

      expect(hlc.last.pt).toBe(1000);
      expect(hlc.last.lc).toBe(6);
    });
  });

  describe("restore from persisted state", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should restore HLC from persisted timestamp", () => {
      const persistedLast: HlcTimestamp = { pt: 5000, lc: 10, node: "node1" };
      const hlc = createHlc("node1", persistedLast);

      expect(hlc.last).toEqual(persistedLast);
    });

    it("should continue from persisted state on tick", () => {
      vi.setSystemTime(6000);
      const persistedLast: HlcTimestamp = { pt: 5000, lc: 10, node: "node1" };
      const hlc = createHlc("node1", persistedLast);

      const ts = hlc.tick();

      expect(ts.pt).toBe(6000);
      expect(ts.lc).toBe(0);
    });

    it("should increment lc if time hasn't advanced past persisted", () => {
      vi.setSystemTime(4000);
      const persistedLast: HlcTimestamp = { pt: 5000, lc: 10, node: "node1" };
      const hlc = createHlc("node1", persistedLast);

      const ts = hlc.tick();

      expect(ts.pt).toBe(5000);
      expect(ts.lc).toBe(11);
    });
  });

  describe("getState", () => {
    it("should return current state for persistence", () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000);

      const hlc = createHlc("node1");
      hlc.tick();
      hlc.tick();

      const state = hlc.getState();

      expect(state.nodeId).toBe("node1");
      expect(state.last).toEqual({ pt: 1000, lc: 1, node: "node1" });

      vi.useRealTimers();
    });

    it("should return a copy, not a reference", () => {
      const hlc = createHlc("node1");
      const state1 = hlc.getState();

      vi.useFakeTimers();
      vi.setSystemTime(2000);
      hlc.tick();
      vi.useRealTimers();

      const state2 = hlc.getState();

      expect(state1.last.pt).not.toBe(state2.last.pt);
    });
  });

  describe("compareHlc", () => {
    it("should return 1 when first timestamp is newer by pt", () => {
      const a: HlcTimestamp = { pt: 2000, lc: 0, node: "a" };
      const b: HlcTimestamp = { pt: 1000, lc: 0, node: "b" };

      expect(compareHlc(a, b)).toBe(1);
    });

    it("should return -1 when first timestamp is older by pt", () => {
      const a: HlcTimestamp = { pt: 1000, lc: 0, node: "a" };
      const b: HlcTimestamp = { pt: 2000, lc: 0, node: "b" };

      expect(compareHlc(a, b)).toBe(-1);
    });

    it("should compare by lc when pt is equal", () => {
      const a: HlcTimestamp = { pt: 1000, lc: 5, node: "a" };
      const b: HlcTimestamp = { pt: 1000, lc: 3, node: "b" };

      expect(compareHlc(a, b)).toBe(1);
      expect(compareHlc(b, a)).toBe(-1);
    });

    it("should compare by node when pt and lc are equal", () => {
      const a: HlcTimestamp = { pt: 1000, lc: 5, node: "b" };
      const b: HlcTimestamp = { pt: 1000, lc: 5, node: "a" };

      expect(compareHlc(a, b)).toBe(1);
      expect(compareHlc(b, a)).toBe(-1);
    });

    it("should return 0 when timestamps are identical", () => {
      const a: HlcTimestamp = { pt: 1000, lc: 5, node: "node1" };
      const b: HlcTimestamp = { pt: 1000, lc: 5, node: "node1" };

      expect(compareHlc(a, b)).toBe(0);
    });
  });

  describe("serialization", () => {
    it("should serialize and deserialize correctly", () => {
      const original: HlcTimestamp = { pt: 1734567890123, lc: 42, node: "abc123" };

      const serialized = serializeHlc(original);
      const deserialized = deserializeHlc(serialized);

      expect(deserialized).toEqual(original);
    });

    it("should produce compact serialization", () => {
      const ts: HlcTimestamp = { pt: 1734567890123, lc: 0, node: "node1" };

      const serialized = serializeHlc(ts);

      expect(serialized.length).toBeLessThan(30);
      expect(serialized).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    });

    it("should handle zero values", () => {
      const original: HlcTimestamp = { pt: 0, lc: 0, node: "x" };

      const serialized = serializeHlc(original);
      const deserialized = deserializeHlc(serialized);

      expect(deserialized).toEqual(original);
    });
  });
});
