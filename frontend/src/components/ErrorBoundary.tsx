import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error(error, info);
	}

	render() {
		if (!this.state.hasError) {
			return this.props.children;
		}

		if (this.props.fallback) {
			return this.props.fallback;
		}

		return (
			<div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
				<p className="text-gray-700">문제가 발생했습니다</p>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					새로고침
				</button>
			</div>
		);
	}
}
