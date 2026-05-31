import { Backdrop, CircularProgress, Typography } from "@mui/material";

type UpdatingDataProps = {
  open: boolean;
  message: string;
}

function UpdatingData(props: UpdatingDataProps) {

  const { open, message } = props;

  return (
  <Backdrop
    sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
    open={open}
  >
    <Typography variant="h6" component="div" gutterBottom>
      {message}
    </Typography>
    <CircularProgress color="inherit" />
  </Backdrop>
  );
} 

export default UpdatingData;