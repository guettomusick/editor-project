import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import React, { FC } from 'react';
import { CustomElement } from './CustomElement';
import TextField from '@mui/material/TextField';
import { changeHyperlink } from './helpers';
import { useSlate } from 'slate-react';
import { Editor, Path } from 'slate';

const style = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

type Props = {
  path?: Path;
  onClose?: (event: unknown, reason: 'backdropClick' | 'escapeKeyDown') => void;
};

const HyperlinkModal: FC<Props> = ({ path, onClose }) => {
  const editor = useSlate();

  const url = path ? (Editor.node(editor, path)?.[0] as CustomElement).url : '';

  return (
    <div>
      <Modal open={path !== undefined} onClose={onClose}>
        <Box sx={style}>
          <TextField
            label="Url"
            variant="standard"
            value={url}
            fullWidth
            onChange={(e) => {
              changeHyperlink(editor, path, e.currentTarget.value);
            }}
          />
        </Box>
      </Modal>
    </div>
  );
};

export default HyperlinkModal;
