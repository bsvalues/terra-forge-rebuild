import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizeParcel,
  parseParcelLinkMessage,
  publishParcel,
  loadLastLinkedParcel,
  subscribeParcelLink,
  isParcelLinkEnabled,
  setParcelLinkEnabled,
  subscribeParcelLinkToggle,
} from "@/lib/parcelLink";

const parcel = {
  id: "p-1", parcelNumber: "123", address: "1 Main", city: "Kennewick",
  assessedValue: 300000, propertyClass: "11", neighborhoodCode: "13010", latitude: 46.2, longitude: -119.1,
};

describe("parcel link", () => {
  beforeEach(() => sessionStorage.clear());

  it("rejects parcels without an id", () => {
    expect(sanitizeParcel({ ...parcel, id: null })).toBeNull();
    expect(sanitizeParcel({ ...parcel, id: "  " })).toBeNull();
    expect(sanitizeParcel("x")).toBeNull();
  });

  it("drops wrongly typed fields to null", () => {
    const p = sanitizeParcel({ ...parcel, assessedValue: "lots", latitude: NaN, city: 5 });
    expect(p?.assessedValue).toBeNull();
    expect(p?.latitude).toBeNull();
    expect(p?.city).toBeNull();
    expect(p?.id).toBe("p-1");
  });

  it("requires a sender id on messages", () => {
    expect(parseParcelLinkMessage({ parcel })).toBeNull();
    expect(parseParcelLinkMessage({ source: "a", parcel })?.parcel.id).toBe("p-1");
  });

  it("remembers the last linked parcel for new side windows", () => {
    publishParcel("a", parcel);
    expect(loadLastLinkedParcel()?.neighborhoodCode).toBe("13010");
  });

  it("delivers to other windows but not back to the sender", async () => {
    const gotOther: string[] = [];
    const gotSelf: string[] = [];
    const offOther = subscribeParcelLink("b", (p) => gotOther.push(p.id!));
    const offSelf = subscribeParcelLink("a", (p) => gotSelf.push(p.id!));
    publishParcel("a", parcel);
    await new Promise((r) => setTimeout(r, 30));
    offOther(); offSelf();
    expect(gotOther).toEqual(["p-1"]);
    expect(gotSelf).toEqual([]);
  });
});
