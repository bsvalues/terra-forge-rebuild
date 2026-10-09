import { describe, it, expect } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("oauthReturnPath", () => {
  it("keeps the consent path with its authorization id", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc")).toBe("/.lovable/oauth/consent?authorization_id=abc");
  });
  it("rejects network paths", () => expect(oauthReturnPath("//evil.example")).toBe("/"));
  it("rejects backslash tricks", () => expect(oauthReturnPath("/\\evil.example/")).toBe("/"));
  it("rejects absolute urls", () => expect(oauthReturnPath("https://evil.example")).toBe("/"));
  it("rejects non-strings", () => expect(oauthReturnPath(null)).toBe("/"));
});
