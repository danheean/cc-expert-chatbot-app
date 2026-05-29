import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/components/chat/MarkdownRenderer';

// SyntaxHighlighter는 토큰별로 DOM을 분할해 getByText 매칭이 어렵기 때문에 mock 처리
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: { children: string; language: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      <code>{children}</code>
    </pre>
  ),
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

describe('MarkdownRenderer', () => {
  describe('일반 텍스트', () => {
    it('평문 텍스트를 렌더링한다', () => {
      render(<MarkdownRenderer content="안녕하세요" />);
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    });

    it('빈 문자열에서 아무것도 렌더링하지 않는다', () => {
      const { container } = render(<MarkdownRenderer content="" />);
      expect(container.innerHTML).toBe('');
    });
  });

  describe('제목', () => {
    it('# 를 h1으로 렌더링한다', () => {
      render(<MarkdownRenderer content="# 제목 1" />);
      expect(screen.getByRole('heading', { level: 1, name: '제목 1' })).toBeInTheDocument();
    });

    it('## 를 h2로 렌더링한다', () => {
      render(<MarkdownRenderer content="## 제목 2" />);
      expect(screen.getByRole('heading', { level: 2, name: '제목 2' })).toBeInTheDocument();
    });

    it('### 를 h3으로 렌더링한다', () => {
      render(<MarkdownRenderer content="### 제목 3" />);
      expect(screen.getByRole('heading', { level: 3, name: '제목 3' })).toBeInTheDocument();
    });
  });

  describe('코드', () => {
    it('인라인 코드에 회색 배경과 빨간 텍스트 클래스를 적용한다', () => {
      render(<MarkdownRenderer content="`const x = 1`" />);
      const code = screen.getByText('const x = 1');
      expect(code.tagName).toBe('CODE');
      expect(code).toHaveClass('bg-gray-200', 'text-red-600');
    });

    it('펜스 코드 블록을 SyntaxHighlighter로 렌더링한다', () => {
      render(<MarkdownRenderer content={'```javascript\nconsole.log("hi")\n```'} />);
      const block = screen.getByTestId('syntax-highlighter');
      expect(block).toBeInTheDocument();
      expect(block).toHaveAttribute('data-language', 'javascript');
    });

    it('언어가 지정된 코드 블록에 언어 정보를 전달한다', () => {
      render(<MarkdownRenderer content={'```python\nprint("hello")\n```'} />);
      expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', 'python');
    });

    it('언어 없는 펜스 코드 블록도 코드 요소로 렌더링한다', () => {
      render(<MarkdownRenderer content={'```\nplain code\n```'} />);
      // 언어 미지정 시 SyntaxHighlighter를 거치지 않고 code 요소로 렌더링됨
      expect(screen.getByText('plain code')).toBeInTheDocument();
    });

    it('코드 블록 내용을 올바르게 렌더링한다', () => {
      render(<MarkdownRenderer content={'```js\nconst a = 1\n```'} />);
      expect(screen.getByText('const a = 1')).toBeInTheDocument();
    });
  });

  describe('링크', () => {
    it('링크를 새 탭에서 열도록 target="_blank"를 설정한다', () => {
      render(<MarkdownRenderer content="[클릭](https://example.com)" />);
      const link = screen.getByRole('link', { name: '클릭' });
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('링크에 rel="noopener noreferrer"를 설정한다', () => {
      render(<MarkdownRenderer content="[클릭](https://example.com)" />);
      const link = screen.getByRole('link', { name: '클릭' });
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('링크 href를 올바르게 설정한다', () => {
      render(<MarkdownRenderer content="[링크](https://example.com)" />);
      expect(screen.getByRole('link', { name: '링크' })).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('리스트', () => {
    it('순서 없는 리스트를 렌더링한다', () => {
      render(<MarkdownRenderer content={'- 항목 1\n- 항목 2'} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getByText('항목 1')).toBeInTheDocument();
      expect(screen.getByText('항목 2')).toBeInTheDocument();
    });

    it('순서 있는 리스트를 렌더링한다', () => {
      render(<MarkdownRenderer content={'1. 첫째\n2. 둘째'} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(screen.getByText('첫째')).toBeInTheDocument();
      expect(screen.getByText('둘째')).toBeInTheDocument();
    });

    it('리스트 항목에 ml-2 클래스를 적용한다', () => {
      render(<MarkdownRenderer content="- 항목" />);
      expect(screen.getByRole('listitem')).toHaveClass('ml-2');
    });
  });

  describe('인용문', () => {
    it('블록쿼트를 렌더링한다', () => {
      render(<MarkdownRenderer content="> 인용 텍스트" />);
      const blockquote = screen.getByText('인용 텍스트').closest('blockquote');
      expect(blockquote).toBeInTheDocument();
    });

    it('블록쿼트에 border-l-4 클래스를 적용한다', () => {
      render(<MarkdownRenderer content="> 인용" />);
      expect(screen.getByText('인용').closest('blockquote')).toHaveClass('border-l-4');
    });
  });

  describe('테이블 (GFM)', () => {
    const tableContent = `
| 이름 | 나이 |
|------|------|
| 홍길동 | 30 |
| 김영희 | 25 |
    `.trim();

    it('테이블을 렌더링한다', () => {
      render(<MarkdownRenderer content={tableContent} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('테이블 헤더를 렌더링한다', () => {
      render(<MarkdownRenderer content={tableContent} />);
      expect(screen.getByRole('columnheader', { name: '이름' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: '나이' })).toBeInTheDocument();
    });

    it('테이블 데이터를 렌더링한다', () => {
      render(<MarkdownRenderer content={tableContent} />);
      expect(screen.getByRole('cell', { name: '홍길동' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: '30' })).toBeInTheDocument();
    });
  });

  describe('수평선', () => {
    it('hr 요소를 렌더링한다', () => {
      render(<MarkdownRenderer content={'텍스트\n\n---\n\n텍스트'} />);
      expect(document.querySelector('hr')).toBeInTheDocument();
    });
  });

  describe('복합 콘텐츠', () => {
    it('제목과 코드 블록이 혼합된 콘텐츠를 렌더링한다', () => {
      const content = `
# 사용법

\`\`\`ts
const greet = () => 'hello'
\`\`\`
      `.trim();

      render(<MarkdownRenderer content={content} />);
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
    });

    it('굵게와 기울임 텍스트를 렌더링한다', () => {
      render(<MarkdownRenderer content="**굵게** 그리고 *기울임*" />);
      expect(screen.getByText('굵게').tagName).toBe('STRONG');
      expect(screen.getByText('기울임').tagName).toBe('EM');
    });
  });
});
