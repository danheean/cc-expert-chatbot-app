import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingOverlayProps {
	message?: string;
}

export function LoadingOverlay({ message = "로딩 중..." }: LoadingOverlayProps) {
	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/40">
			<LoadingSpinner size="lg" />
			<p className="text-sm font-medium text-white">{message}</p>
		</div>
	);
}
