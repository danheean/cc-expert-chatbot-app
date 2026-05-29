import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../../src/components/layout/Header';

describe('Header', () => {
  it('앱 제목을 렌더링한다', () => {
    render(<Header onMenuClick={vi.fn()} />);
    expect(screen.getByText('AI 챗봇')).toBeDefined();
  });

  it('aria-label이 있는 메뉴 버튼을 렌더링한다', () => {
    render(<Header onMenuClick={vi.fn()} />);
    expect(screen.getByLabelText('메뉴 열기')).toBeDefined();
  });

  it('메뉴 버튼 클릭 시 onMenuClick을 호출한다', () => {
    const onMenuClick = vi.fn();
    render(<Header onMenuClick={onMenuClick} />);
    fireEvent.click(screen.getByLabelText('메뉴 열기'));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('세션 제목이 전달되면 표시한다', () => {
    render(<Header onMenuClick={vi.fn()} sessionTitle="날씨 대화" />);
    expect(screen.getByText('날씨 대화')).toBeDefined();
  });
});
