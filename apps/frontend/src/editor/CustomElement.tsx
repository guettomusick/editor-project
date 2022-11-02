import React from 'react'
import { BaseElement } from 'slate'
import { RenderElementProps } from 'slate-react'

export enum CustomElementType {
  blockQuote = 'block-quote',
  bulletedList = 'bulleted-list',
  headingOne = 'heading-one',
  headingTwo = 'heading-two',
  headingThree = 'heading-three',
  headingFour = 'heading-four',
  headingFive = 'heading-five',
  headingSix = 'heading-six',
  listItem = 'list-item',
  numberedList = 'numbered-list',
  paragraph = 'paragraph',
  link = 'link',
  code = 'code',
}

export interface CustomElement extends BaseElement {
  type: CustomElementType
  url?: string
}

export const CustomElement: React.FC<RenderElementProps> = ({ attributes, children, element }) => {
  switch (element.type) {
    case CustomElementType.blockQuote:
      return <blockquote {...attributes}>{children}</blockquote>
    case CustomElementType.bulletedList:
      return <ul {...attributes}>{children}</ul>
    case CustomElementType.headingOne:
      return <h1 {...attributes}>{children}</h1>
    case CustomElementType.headingTwo:
      return <h2 {...attributes}>{children}</h2>
    case CustomElementType.headingThree:
      return <h3 {...attributes}>{children}</h3>
    case CustomElementType.headingFour:
      return <h4 {...attributes}>{children}</h4>
    case CustomElementType.headingFive:
      return <h5 {...attributes}>{children}</h5>
    case CustomElementType.headingSix:
      return <h6 {...attributes}>{children}</h6>
    case CustomElementType.listItem:
      return <li {...attributes}>{children}</li>
    case CustomElementType.numberedList:
      return <ol {...attributes}>{children}</ol>
    case CustomElementType.link:
      return <a {...attributes} href={element.url}>{children}</a>
    case CustomElementType.code:
      return <pre {...attributes}>{children}</pre>
    default:
      return <p {...attributes}>{children}</p>
  }
}