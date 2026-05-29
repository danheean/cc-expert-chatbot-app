import type { Theme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

interface HeaderProps {
	onMenuClick: () => void;
	sessionTitle?: string;
	theme?: Theme;
	onCycleTheme?: () => void;
}

function ThemeIcon({ theme }: { theme: Theme }) {
	if (theme === "light") {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
			</svg>
		);
	}
	if (theme === "dark") {
		return (
			<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
			</svg>
		);
	}
	return (
		<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
		</svg>
	);
}

const THEME_LABELS: Record<Theme, string> = {
	light: "라이트 모드",
	dark: "다크 모드",
	system: "시스템 모드",
};

export function Header({ onMenuClick, sessionTitle, theme = "system", onCycleTheme }: HeaderProps) {
	return (
		<header className="flex h-14 items-center gap-3 border-b bg-background px-4">
			<Button
				variant="ghost"
				size="icon"
				aria-label="메뉴 열기"
				onClick={onMenuClick}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</Button>
			<span className="font-semibold">AI 챗봇</span>
			{sessionTitle && (
				<span className="truncate text-sm text-muted-foreground">{sessionTitle}</span>
			)}
			<div className="ml-auto">
				<Button
					variant="ghost"
					size="icon"
					aria-label={THEME_LABELS[theme]}
					title={THEME_LABELS[theme]}
					onClick={onCycleTheme}
				>
					<ThemeIcon theme={theme} />
				</Button>
			</div>
		</header>
	);
}
