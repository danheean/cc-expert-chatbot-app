import { render, screen } from '@testing-library/react';
import { Layout } from '../../src/components/layout/Layout';

const defaultProps = {
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  error: null,
  onSendMessage: vi.fn(),
  onSelectSession: vi.fn(),
  onNewChat: vi.fn(),
  onDeleteSession: vi.fn(),
  onRenameSession: vi.fn(),
};

describe('Layout', () => {
  it('앱 제목이 포함된 헤더를 렌더링한다', () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByText('AI 챗봇')).toBeDefined();
  });

  it('새 대화 버튼이 포함된 사이드바를 렌더링한다', () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByText(/새 대화/)).toBeDefined();
  });

  it('메시지 입력 영역을 렌더링한다', () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByPlaceholderText(/메시지/)).toBeDefined();
  });

  it('메시지가 없을 때 빈 상태를 렌더링한다', () => {
    render(<Layout {...defaultProps} />);
    expect(screen.getByText(/대화를 시작/)).toBeDefined();
  });

  it('에러가 있으면 에러 메시지를 렌더링한다', () => {
    render(<Layout {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText(/Something went wrong/)).toBeDefined();
  });
});
