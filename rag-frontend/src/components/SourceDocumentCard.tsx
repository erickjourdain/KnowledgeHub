import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  IconButton,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TagIcon from '@mui/icons-material/Tag';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchChunk, downloadDocumentFile, type ChunkDetail } from '@api/collections';

interface SourceDocumentPart {
  type: 'source-document';
  sourceId: string;
  title: string; // Nom du fichier
  text: string;  // Chapitre / Section
}

interface SourceDocumentCardProps {
  part: SourceDocumentPart;
  collectionIdOrSlug?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <PictureAsPdfIcon sx={{ color: '#f87171', fontSize: '1.25rem' }} />;
  }
  if (ext === 'txt') {
    return <DescriptionIcon sx={{ color: '#60a5fa', fontSize: '1.25rem' }} />;
  }
  return <ArticleIcon sx={{ color: '#c084fc', fontSize: '1.25rem' }} />;
};

const preprocessMarkdown = (text: string): string => {
  if (!text) return '';
  return text.replace(/\|\s*\r?\n\s*\r?\n\s*\|/g, '|\n|');
};

export default function SourceDocumentCard({ part, collectionIdOrSlug }: SourceDocumentCardProps) {
  const [open, setOpen] = useState(false);
  const [chunkDetail, setChunkDetail] = useState<ChunkDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingDoc, setOpeningDoc] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleViewDocument = async () => {
    if (!chunkDetail?.document_id || !collectionIdOrSlug) return;
    try {
      setOpeningDoc(true);
      const blob = await downloadDocumentFile(collectionIdOrSlug, chunkDetail.document_id);
      const getMediaType = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'application/pdf';
        if (ext === 'txt') return 'text/plain';
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        return 'application/octet-stream';
      };
      const mediaType = getMediaType(part.title);
      const typedBlob = new Blob([blob], { type: mediaType });
      const url = URL.createObjectURL(typedBlob);
      
      let finalUrl = url;
      if (mediaType === 'application/pdf' && chunkDetail.page !== null && chunkDetail.page !== undefined) {
        finalUrl = `${url}#page=${chunkDetail.page}`;
      }
      
      window.open(finalUrl, '_blank');
    } catch (err) {
      console.error("Erreur lors de l'ouverture du document", err);
    } finally {
      setOpeningDoc(false);
    }
  };

  useEffect(() => {
    if (open && part.sourceId) {
      setLoading(true);
      setError(null);
      fetchChunk(part.sourceId)
        .then((data) => {
          setChunkDetail(data);
        })
        .catch((err) => {
          console.error(err);
          setError("Impossible de charger le contenu de la source");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, part.sourceId]);

  return (
    <>
      <Box
        onClick={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.25,
          my: 0.5,
          maxWidth: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            backgroundColor: 'rgba(99, 102, 241, 0.04)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
            '& .source-title': {
              color: 'primary.light',
            }
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {getFileIcon(part.title)}
        </Box>
        
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            className="source-title"
            variant="caption"
            fontWeight="600"
            color="text.primary"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s ease',
              fontSize: '0.8rem'
            }}
          >
            {part.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.725rem'
            }}
          >
            {part.text}
          </Typography>
        </Box>
        
        <IconButton 
          size="small" 
          sx={{ 
            color: 'text.secondary',
            '&:hover': { color: 'primary.light', backgroundColor: 'rgba(255, 255, 255, 0.04)' }
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* Dialogue de Détails de la Source */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              p: 1
            }
          }
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component="span" variant="h6" fontWeight="600" sx={{ fontSize: '1.1rem' }}>
            Source Référencée
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', py: 2.5, minHeight: '200px' }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={32} thickness={4} sx={{ color: 'primary.light' }} />
              <Typography variant="body2" color="text.secondary">
                Chargement du contenu...
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          ) : chunkDetail ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.04)', display: 'flex' }}>
                  {getFileIcon(part.title)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {chunkDetail?.document_id && collectionIdOrSlug ? (
                      <Typography 
                        variant="body2" 
                        fontWeight="600" 
                        color="primary.light" 
                        onClick={handleViewDocument}
                        sx={{ 
                          wordBreak: 'break-all',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {part.title}
                      </Typography>
                    ) : (
                      <Typography variant="body2" fontWeight="600" color="text.primary" sx={{ wordBreak: 'break-all' }}>
                        {part.title}
                      </Typography>
                    )}
                    {openingDoc && <CircularProgress size={14} sx={{ color: 'primary.light' }} />}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Document de la base de connaissances
                  </Typography>
                </Box>
              </Box>

              {/* Badges de métadonnées */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {chunkDetail.page !== null && chunkDetail.page !== undefined && (
                  <Chip 
                    icon={<TagIcon sx={{ fontSize: '0.9rem !important' }} />}
                    label={`Page ${chunkDetail.page}`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                      color: 'primary.light',
                      borderColor: 'rgba(99, 102, 241, 0.2)',
                      borderWidth: 1,
                      borderStyle: 'solid',
                      fontWeight: 500
                    }}
                  />
                )}
                {chunkDetail.chapter && (
                  <Chip 
                    icon={<MenuBookIcon sx={{ fontSize: '0.9rem !important' }} />}
                    label={`Chapitre : ${chunkDetail.chapter}`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: 'text.secondary',
                      maxWidth: '250px',
                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                    }}
                  />
                )}
                {chunkDetail.section && (
                  <Chip 
                    icon={<BookmarkIcon sx={{ fontSize: '0.9rem !important' }} />}
                    label={`Section : ${chunkDetail.section}`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: 'text.secondary',
                      maxWidth: '250px',
                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                    }}
                  />
                )}
                {chunkDetail.subsection && (
                  <Chip 
                    icon={<FolderIcon sx={{ fontSize: '0.9rem !important' }} />}
                    label={`Sous-section : ${chunkDetail.subsection}`}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      borderColor: 'rgba(255, 255, 255, 0.12)',
                      color: 'text.secondary',
                      maxWidth: '250px',
                      '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                    }}
                  />
                )}
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 3 }} />

              {/* Rendu Markdown du passage */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1.5 }}>
                  Extrait du Document
                </Typography>
                
                <Box
                  sx={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.6,
                    fontSize: '0.95rem',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    pr: 1,
                    '& p': {
                      my: 1.5,
                    },
                    '& p:first-of-type': {
                      mt: 0,
                    },
                    '& p:last-of-type': {
                      mb: 0,
                    },
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                      color: 'primary.light',
                      fontWeight: 600,
                      mt: 2.5,
                      mb: 1.5,
                    },
                    '& code': {
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      px: 0.8,
                      py: 0.2,
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '0.9em',
                    },
                    '& pre': {
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      p: 1.5,
                      borderRadius: '8px',
                      overflowX: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      '& code': {
                        backgroundColor: 'transparent',
                        p: 0,
                        borderRadius: 0,
                      }
                    },
                    '& ul, & ol': {
                      pl: 3,
                      my: 1.5,
                    },
                    '& li': {
                      my: 0.5,
                    },
                    '& blockquote': {
                      borderLeft: '4px solid',
                      borderColor: 'primary.main',
                      pl: 2,
                      my: 2,
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontStyle: 'italic',
                    }
                  }}
                >
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
                    {preprocessMarkdown(chunkDetail.chunk_text)}
                  </Markdown>
                </Box>
              </Box>
            </>
          ) : null}
        </DialogContent>
        
        <DialogActions sx={{ p: 1.5 }}>
          <Button 
            onClick={handleClose} 
            variant="contained" 
            color="primary"
            size="small"
            sx={{ px: 3, borderRadius: '8px' }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
