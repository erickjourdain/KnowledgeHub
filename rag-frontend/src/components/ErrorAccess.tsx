import { Box, Container, Paper, Typography } from '@mui/material';
import FrontHandIcon from '@mui/icons-material/FrontHand';

const ErrorAccess = () => {

  return (
    <Container maxWidth="md" sx={{ height: '250px' }}>
      <Paper sx={{
        height: '100%',
        p: 2,
        flexDirection: "column",
        justifyItems: 'center',
        alignContent: 'space-around'
      }}>
        <Box>
          <FrontHandIcon fontSize='large' color='error' />
        </Box>
        <Typography variant='h5'>
          Vous ne disposez des droits pour accéder à cette page
        </Typography>
      </Paper>
    </Container>
  )
}

export default ErrorAccess;