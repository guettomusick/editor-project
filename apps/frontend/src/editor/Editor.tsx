// @refresh reset // Fixes hot refresh errors in development https://github.com/ianstormtaylor/slate/issues/3477

import React, { useCallback, useState, useEffect } from 'react';
import { createEditor, Descendant, BaseEditor, Path } from 'slate';
import { HistoryEditor } from 'slate-history';
import { handleHotkeys } from './helpers';
import withHtml from './withHtml'

import { Editable, withReact, Slate, ReactEditor } from 'slate-react';
import { EditorToolbar } from './EditorToolbar';
import { CustomElement } from './CustomElement';
import { CustomLeaf, CustomText } from './CustomLeaf';
import { withYjs, YjsEditor, withYHistory } from '@slate-yjs/core';
import * as Y from 'yjs';

import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import HoveringToolbar from './HoveringToolbar';
import HyperlinkModal from './HyperlinkModal';

// Slate suggests overwriting the module to include the ReactEditor, Custom Elements & Text
// https://docs.slatejs.org/concepts/12-typescript
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

interface EditorProps {
  sharedType: Y.XmlText;
  placeholder?: string;
  disabled?: boolean;
}

export const Editor: React.FC<EditorProps> = ({ sharedType, placeholder, disabled }) => {
  const [hyperlinkEditPath, setHyperlinkEditPath] = useState<Path | undefined>(undefined)
  const [value, setValue] = useState<Array<Descendant>>([]);
  const renderElement = useCallback(
    (props) =>  <CustomElement {...props} />,
    []
  );
  const renderLeaf = useCallback((props) => <CustomLeaf {...props} />, []);

  const [editor] = useState(() => {
    return withHtml(withReact(
      withYHistory(withYjs(createEditor(), sharedType, { autoConnect: false }))
    ));
  });

  useEffect(() => {
    YjsEditor.connect(editor);
    return () => YjsEditor.disconnect(editor);
  }, [editor]);

  return (
    <>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={!!disabled}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Slate editor={editor} value={value} onChange={(value) => setValue(value)}>
        {/* <EditorToolbar onAddHyperlink={(element: CustomElement) => {
          setHyperlinkEditElement(element)
        }/> */}
        <EditorToolbar />
        <HoveringToolbar onEditHyperlink={(path) => {
          setHyperlinkEditPath(path)
        }} />
        <HyperlinkModal path={hyperlinkEditPath} onClose={() => setHyperlinkEditPath(undefined)}/>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          onKeyDown={handleHotkeys(editor)}
          // The dev server injects extra values to the editr and the console complains
          // so we override them here to remove the message
          autoCapitalize="false"
          autoCorrect="false"
          spellCheck="false"
        />
      </Slate>
    </>
  );
};
