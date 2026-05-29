interface WelcomeScreenProps {
	onSendMessage: (message: string) => void;
}

const CARDS = [
	{
		label: "오늘의 시간",
		sub: "정확한 시간 확인",
		message: "지금 몇 시야?",
		bgPosition: "0% 50%",
	},
	{
		label: "현재 날씨",
		sub: "실시간 날씨 정보",
		message: "오늘 날씨 어때?",
		bgPosition: "50% 50%",
	},
	{
		label: "편리한 계산기",
		sub: "쉽고 빠른 계산",
		message: "123 + 456 계산해줘",
		bgPosition: "100% 50%",
	},
];

export function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
			<div className="text-center">
				<h2 className="text-xl font-semibold">무엇을 도와드릴까요?</h2>
				<p className="mt-1 text-sm text-muted-foreground">카드를 클릭하여 대화를 시작하세요</p>
			</div>

			<div className="flex flex-wrap justify-center gap-4">
				{CARDS.map((card) => (
					<button
						key={card.label}
						type="button"
						onClick={() => onSendMessage(card.message)}
						className="group flex w-44 flex-col overflow-hidden rounded-2xl border border-hairline shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<div
							className="h-56 w-full"
							style={{
								backgroundImage: "url('/welcome-cards.png')",
								backgroundSize: "300% auto",
								backgroundPosition: card.bgPosition,
							}}
						/>
						<div className="bg-background px-3 py-2 text-left">
							<p className="text-sm font-semibold">{card.label}</p>
							<p className="text-xs text-muted-foreground">{card.sub}</p>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
