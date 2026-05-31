import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle 
} from "@mui/material";
import { useEffect, useRef } from "react";

type ConfirmationDialogRawProps = {
  id: string;
  title: string;
  message: string;
  open: boolean;
  onClose: (value?: boolean) => void;
}

function ConfirmationDialog(props: ConfirmationDialogRawProps) {

  const { onClose, title, message, open, ...other } = props;
  const previousActiveElement = useRef<Element | null>(null);
  const wasOpen = useRef<boolean>(false);

  useEffect(() => {
    if (open) {
      // Sauvegarde l'élément qui avait le focus avant l'ouverture du dialog
      previousActiveElement.current = document.activeElement;
      wasOpen.current = true;
    } else if (wasOpen.current) {
      // Le dialog vient de se fermer, restaure le focus
      wasOpen.current = false;
      if (previousActiveElement.current && previousActiveElement.current instanceof HTMLElement) {
        setTimeout(() => {
          (previousActiveElement.current as HTMLElement).focus();
        }, 100);
      }
    }
  }, [open]);

  const handleCancel = () => {
    onClose(false);
  }

  const handleOk = () => {
    onClose(true);
  }

  const handleClose = () => {
    onClose(false);
  };
  
  return (
    <Dialog 
      maxWidth="xs" 
      fullWidth 
      open={open}
      disableRestoreFocus={true}
      {...other} 
      onClose={handleClose}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
          <Button onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleOk}>Ok</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmationDialog;