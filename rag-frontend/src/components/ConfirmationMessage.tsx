import { Alert, Snackbar } from "@mui/material";

type ConfirmationMessageProps = {
  open: boolean;
  message: string;
  color: "success" | "error" | "warning";
  onClose: () => void;
}

function ConfirmationMessage({ open, message, color, onClose }: ConfirmationMessageProps) {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={open}
      onClose={onClose}
      autoHideDuration={5000}
    >
      <Alert
        onClose={onClose}
        severity={color}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

export default ConfirmationMessage;