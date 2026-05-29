interface ErrorMessageProps {
	message: string;
	onRetry?: () => void;
	onDismiss?: () => void;
}

const HTTP_ERROR_MAP: Record<number, string> = {
	400: "잘못된 요청입니다",
	401: "인증이 필요합니다",
	403: "접근 권한이 없습니다",
	404: "요청한 리소스를 찾을 수 없습니다",
	408: "요청 시간이 초과되었습니다",
	429: "요청이 너무 많습니다",
	500: "서버 오류가 발생했습니다",
	502: "게이트웨이 오류가 발생했습니다",
	503: "서비스를 일시적으로 사용할 수 없습니다",
	504: "게이트웨이 응답 시간이 초과되었습니다",
};

function resolveMessage(message: string): string {
	const code = parseInt(message, 10);
	return HTTP_ERROR_MAP[code] ?? message;
}

export function ErrorMessage({ message, onRetry, onDismiss }: ErrorMessageProps) {
	return (
		<div className="flex items-start gap-3 rounded-md bg-red-50 p-4 text-red-800 ring-1 ring-red-300">
			<p className="flex-1 text-sm">{resolveMessage(message)}</p>
			<div className="flex shrink-0 gap-2">
				{onRetry && (
					<button
						type="button"
						onClick={onRetry}
						className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
					>
						다시 시도
					</button>
				)}
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						className="rounded bg-red-100 px-3 py-1 text-xs text-red-700 hover:bg-red-200"
					>
						닫기
					</button>
				)}
			</div>
		</div>
	);
}
