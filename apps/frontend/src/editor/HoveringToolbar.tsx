import * as ReactDOM from 'react-dom';
import { ChangeEventHandler, FC, forwardRef, MouseEvent, PropsWithChildren, useEffect, useRef } from 'react'
import { useFocused, useSlate } from 'slate-react';
import { Editor, Path } from 'slate';
import { css } from '@emotion/css';
import { CustomElement, CustomElementType } from './CustomElement';

import LinkOffIcon from '@mui/icons-material/LinkOff';
import LaunchIcon from '@mui/icons-material/Launch';
import EditIcon from '@mui/icons-material/Edit';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { toggleBlock } from './helpers';

export const Portal: FC = ({ children }) => {
  return typeof document === 'object'
    ? ReactDOM.createPortal(children, document.body)
    : null
}

interface BaseProps {
  className: string
  [key: string]: unknown
}

export const Menu = forwardRef(
  (
    { className, ...props }: PropsWithChildren<BaseProps>,
    ref?: React.Ref<HTMLDivElement>
  ) => (
    <Box
      onMouseDown={(e: MouseEvent<HTMLFormElement, globalThis.MouseEvent>) => {
        // prevent toolbar from taking focus away from editor
        e.preventDefault()
      }}
      component="form"
      maxWidth="sm"
      {...props}
      ref={ref}
      className={css`
        padding: 8px 7px 6px;
        position: absolute;
        z-index: 10000;
        top: -10000px;
        left: -10000px;
        margin-top: -6px;
        opacity: 0;
        background-color: #FFF;
        border-radius: 20px;
        border: 1px solid #999;
        transition: opacity 0.75s;
      `}
    />
  )
)

type Props = {
  onEditHyperlink: (path?: Path) => void,
}

const HoveringToolbar: FC<Props> = ({ onEditHyperlink }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const editor = useSlate()

  const above: CustomElement | undefined = Editor.above(editor)?.[0] as CustomElement

  useEffect(() => {
    const el = ref.current
    const { selection } = editor

    if (!el) {
      return
    }

    if (
      !selection ||
      above?.type !== CustomElementType.link
    ) {
      el.removeAttribute('style')
      return
    }

    const domSelection = window.getSelection()
    const domRange = domSelection?.getRangeAt(0)
    const rect = domRange?.getBoundingClientRect()
    if (rect) {
      el.style.opacity = '1'
      el.style.top = `${rect.top + window.pageYOffset - el.offsetHeight}px`
      el.style.left = `${rect.left +
        window.pageXOffset -
        el.offsetWidth / 2 +
        rect.width / 2}px`
      }
  })

  return (
    <Portal>
      <Menu
        ref={ref}
      >
        <a href={above?.url} target="_blank">{above?.url}</a>
        <IconButton color="primary" aria-label="edit hyperlink" component="label" onClick={ () => onEditHyperlink && onEditHyperlink(Editor.above(editor)?.[1])}>
          <EditIcon />
        </IconButton>
        <IconButton color="primary" aria-label="remove hyperlink" component="label" onClick={() => {
          toggleBlock(editor, CustomElementType.link)
        }}>
          <LinkOffIcon />
        </IconButton>
      </Menu>
    </Portal>
  )
}

export default HoveringToolbar
