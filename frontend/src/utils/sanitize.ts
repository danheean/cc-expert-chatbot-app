const ALLOWED_PROTOCOLS = /^(https?:|mailto:)/i;

export function sanitizeUrl(url: string): string {
	const trimmed = url.trim();
	return ALLOWED_PROTOCOLS.test(trimmed) ? trimmed : "#";
}

const HTML_ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(str: string): string {
	return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}
