import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "chatbot-theme";

function getSystemTheme(): ResolvedTheme {
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark" || stored === "system") {
		return stored;
	}
	return "system";
}

function resolveTheme(theme: Theme): ResolvedTheme {
	return theme === "system" ? getSystemTheme() : theme;
}

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		const root = document.documentElement;

		function applyTheme() {
			if (resolveTheme(theme) === "dark") {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}

		applyTheme();
		localStorage.setItem(STORAGE_KEY, theme);

		if (theme === "system") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			mq.addEventListener("change", applyTheme);
			return () => mq.removeEventListener("change", applyTheme);
		}
	}, [theme]);

	const cycleTheme = () => {
		setTheme((prev) => {
			if (prev === "light") return "dark";
			if (prev === "dark") return "system";
			return "light";
		});
	};

	return { theme, cycleTheme };
}
