import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const preprocessMarkdown = (text: string): string => {
  if (!text) return '';
  return text.replace(/\|\s*\r?\n\s*\r?\n\s*\|/g, '|\n|');
};

interface ChatMessageMarkdownProps {
  text: string;
}

export default function ChatMessageMarkdown({ text }: ChatMessageMarkdownProps) {
  return (
    <Markdown 
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ node, ...props }) => (
          <TableContainer 
            component={Box} 
            sx={{ 
              my: 2, 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'rgba(0, 0, 0, 0.2)' 
            }}
          >
            <Table size="small" {...props} />
          </TableContainer>
        ),
        thead: ({ node, ...props }) => <TableHead {...props} />,
        tbody: ({ node, ...props }) => <TableBody {...props} />,
        tr: ({ node, ...props }) => <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }} {...props} />,
        th: ({ node, align, ...props }) => (
          <TableCell 
            align={(align === 'char' ? 'left' : align) as any} 
            sx={{ 
              fontWeight: '600', 
              color: 'primary.light', 
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              py: 1 
            }} 
            {...props} 
          />
        ),
        td: ({ node, align, ...props }) => (
          <TableCell 
            align={(align === 'char' ? 'left' : align) as any} 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.8)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              py: 0.75 
            }} 
            {...props} 
          />
        ),
      }}
    >
      {preprocessMarkdown(text)}
    </Markdown>
  );
}
