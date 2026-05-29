import { sanitizeUrl, escapeHtml } from "../../src/utils/sanitize";

describe("URL 새니타이징", () => {
  it("http/https/mailto URL을 허용한다", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    expect(sanitizeUrl("mailto:test@example.com")).toBe(
      "mailto:test@example.com",
    );
  });

  it("javascript: URL을 차단한다", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
  });

  it("data: URL을 차단한다", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
  });
});

describe("HTML 이스케이프", () => {
  it("HTML 특수 문자를 이스케이프한다", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("특수 문자가 없으면 문자열을 그대로 반환한다", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});
