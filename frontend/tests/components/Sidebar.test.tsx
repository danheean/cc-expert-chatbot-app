import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../src/components/layout/Sidebar';

const mockSessions = [
  { id: '1', title: '세션 1', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', title: '세션 2', createdAt: new Date(), updatedAt: new Date() },
];

const defaultHandlers = {
  onNewChat: vi.fn(),
  onSelectSession: vi.fn(),
  onDeleteSession: vi.fn(),
  onRenameSession: vi.fn(),
};

describe('Sidebar', () => {
  it('새 대화 버튼을 렌더링한다', () => {
    render(<Sidebar sessions={[]} {...defaultHandlers} />);
    expect(screen.getByText(/새 대화/)).toBeDefined();
  });

  it('세션 목록을 렌더링한다', () => {
    render(<Sidebar sessions={mockSessions} {...defaultHandlers} />);
    expect(screen.getByText('세션 1')).toBeDefined();
    expect(screen.getByText('세션 2')).toBeDefined();
  });

  it('현재 세션을 강조 표시한다', () => {
    render(
      <Sidebar sessions={mockSessions} currentSessionId="1"
        {...defaultHandlers} />
    );
    const session1 = screen.getByText('세션 1').closest('button');
    expect(session1?.className).toContain('bg-accent');
  });

  it('세션이 없을 때 안내 문구를 표시한다', () => {
    render(<Sidebar sessions={[]} {...defaultHandlers} />);
    expect(screen.getByText(/대화 없음/)).toBeDefined();
  });

  it('새 대화 버튼 클릭 시 onNewChat을 호출한다', () => {
    const onNewChat = vi.fn();
    render(<Sidebar sessions={[]} {...defaultHandlers} onNewChat={onNewChat} />);
    fireEvent.click(screen.getByText(/새 대화/));
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('세션 클릭 시 onSelectSession을 호출한다', () => {
    const onSelectSession = vi.fn();
    render(
      <Sidebar sessions={mockSessions} {...defaultHandlers} onSelectSession={onSelectSession} />
    );
    fireEvent.click(screen.getByText('세션 1'));
    expect(onSelectSession).toHaveBeenCalledWith('1');
  });

  it('삭제 버튼 클릭 시 onDeleteSession을 호출한다', () => {
    const onDeleteSession = vi.fn();
    render(
      <Sidebar sessions={mockSessions} {...defaultHandlers} onDeleteSession={onDeleteSession} />
    );
    const deleteButtons = screen.getAllByLabelText('세션 삭제');
    fireEvent.click(deleteButtons[0]);
    expect(onDeleteSession).toHaveBeenCalledWith('1');
  });
});
