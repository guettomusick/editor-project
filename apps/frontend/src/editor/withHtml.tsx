import { jsx } from 'slate-hyperscript'
import { BaseEditor, Node, Text } from "slate"
import { HistoryEditor } from "slate-history"
import { ReactEditor } from "slate-react"
import { CustomElement } from "./CustomElement"
import { Transforms } from 'slate'

const ELEMENT_TAGS: Record<string, (el: HTMLElement) => {type: string}> = {
  A: (el: HTMLElement) => ({ type: 'link', url: el.getAttribute('href') }),
  BLOCKQUOTE: () => ({ type: 'quote' }),
  H1: () => ({ type: 'heading-one' }),
  H2: () => ({ type: 'heading-two' }),
  H3: () => ({ type: 'heading-three' }),
  H4: () => ({ type: 'heading-four' }),
  H5: () => ({ type: 'heading-five' }),
  H6: () => ({ type: 'heading-six' }),
  LI: () => ({ type: 'list-item' }),
  OL: () => ({ type: 'numbered-list' }),
  P: () => ({ type: 'paragraph' }),
  PRE: () => ({ type: 'code' }),
  UL: () => ({ type: 'bulleted-list' }),
}

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
const TEXT_TAGS: Record<string, (el: HTMLElement) => Record<string, boolean>> = {
  CODE: () => ({ code: true }),
  DEL: () => ({ strikethrough: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  S: () => ({ strikethrough: true }),
  STRONG: () => ({ bold: true }),
  U: () => ({ underline: true }),
}

export const deserialize = (el: HTMLElement): unknown => {
  if (el.nodeType === 3) {
    return el.textContent
  } else if (el.nodeType !== 1) {
    return null
  } else if (el.nodeName === 'BR') {
    return '\n'
  }

  const styleAttrs: Record<string, boolean> = {}
  if (el.style.fontStyle === 'italic') { styleAttrs.italic = true }
  if (Number(el.style.fontWeight || '400') > 400) { styleAttrs.bold = true }
  if (el.style.textDecoration === 'underline') { styleAttrs.underline = true }
  if (el.classList.contains('s1')) { styleAttrs.underline = true }

  const { nodeName } = el
  let parent: ChildNode = el

  if (
    nodeName === 'PRE' &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === 'CODE'
  ) {
    parent = el.childNodes[0]
  }

  let children = Array.from(parent.childNodes)
    .map((node) => deserialize(node as HTMLElement))
    .flat()

  if (children.length === 0) {
    children = [{ text: '' }]
  }

  if (el.nodeName === 'BODY') {
    return jsx('fragment', {}, children)
  }

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = {
      ...styleAttrs,
      ...ELEMENT_TAGS[nodeName](el),
    }
    return jsx('element', attrs, children)
  }

  if (children.length <= 1 && !Array.from(el.children).some((child) => !Text.isText(child))) {
    const attrs = TEXT_TAGS[nodeName] ? {
      ...styleAttrs,
      ...TEXT_TAGS[nodeName](el),
    } : styleAttrs
    
    return children.map(child => jsx('text', attrs, child))
  }

  return children
}

const withHtml = <T extends ReactEditor>(editor: T): T & ReactEditor => {
  const { insertData, isInline } = editor

  editor.isInline = (element: CustomElement) => {
    return element.type === 'link' ? true : isInline(element)
  }

  editor.insertData = data => {
    const html = data.getData('text/html')

    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html')
      const fragment = deserialize(parsed.body)
      Transforms.insertFragment(editor as unknown as BaseEditor & ReactEditor & HistoryEditor, fragment as Node[])
      return
    }

    insertData(data)
  }

  return editor
}

export default withHtml
