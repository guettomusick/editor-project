import React from 'react'
import { BaseText } from 'slate'
import { RenderLeafProps } from 'slate-react'

export interface CustomText extends BaseText {
  bold?: boolean
  code?: boolean
  italic?: boolean
  underline?: boolean
}

export const CustomLeaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
  const style = {
    fontWeight: leaf.bold ? '700' : '400',
    fontStyle: leaf.italic ? 'italic' : 'normal',
    textDecoration: leaf.underline ? 'underline' : 'none',
  }

  const className = leaf.underline ? 's1' : ''

  if (leaf.bold) {
    children = <b>{children}</b>
  }

  if (leaf.code) {
    children = <code>{children}</code>
  }

  if (leaf.italic) {
    children = <i>{children}</i>
  }

  if (leaf.underline) {
    children = <u>{children}</u>
  }

  return <b {...attributes} style={style} className={className} >{children}</b>
}


