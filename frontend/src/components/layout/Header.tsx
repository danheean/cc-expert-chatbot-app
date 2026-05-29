import { Button } from "@/components/ui/button";

interface HeaderProps {
	onMenuClick: () => void;
	sessionTitle?: string;
}

export function Header({ onMenuClick, sessionTitle }: HeaderProps) {
	return (
		<header className="flex h-14 items-center gap-3 border-b bg-white px-4">
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
				<span className="truncate text-sm text-gray-500">{sessionTitle}</span>
			)}
		</header>
	);
}
