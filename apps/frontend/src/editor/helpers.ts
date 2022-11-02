import { Editor, Transforms, Element as SlateElement, Path, Node } from 'slate'
import isHotkey from 'is-hotkey'
import { KeyboardEvent } from 'react'
import { CustomElementType } from './CustomElement'
import { CustomText } from './CustomLeaf'

const LIST_TYPES = ['numbered-list', 'bulleted-list']

export const changeHyperlink = (editor: Editor, path?: Path, url?: string): void => {
  if (!path) return

  const newProperties: Partial<SlateElement> = {
    type: CustomElementType.link,
    url,
  }

  Transforms.setNodes(editor, newProperties, {
    at: path
  })
}

export const toggleBlock = (editor: Editor, format: CustomElementType): void => {
  const isActive = isBlockActive(editor, format)
  const isList = LIST_TYPES.includes(format)
  const isLink = format === CustomElementType.link

  console.log(isLink, isActive)
  if (isLink && !isActive) {
    const selectedText = editor.getFragment().flatMap(n => Node.string(n)).join('')

    if (selectedText) {
      Transforms.insertNodes(
        editor,
        { type: format, url: encodeURI(selectedText.startsWith('http') ? selectedText : `https://${selectedText}`), children: [{ text: selectedText }]}
      )
    }
  } else {
    Transforms.unwrapNodes(editor, {
      match: n =>
        isLink ? 
        CustomElementType.link === (!Editor.isEditor(n) && SlateElement.isElement(n) && n.type as any) : // eslint-disable-line @typescript-eslint/no-explicit-any,
        LIST_TYPES.includes(
          !Editor.isEditor(n) && SlateElement.isElement(n) && n.type as any // eslint-disable-line @typescript-eslint/no-explicit-any
        ),
      split: true,
    })
    const newProperties: Partial<SlateElement> = {
      type: isActive ? CustomElementType.paragraph : isList ? CustomElementType.listItem : format,
      url: undefined
    }

    Transforms.setNodes(editor, newProperties)

    if (!isActive && isList) {
      const block = { type: format, children: [] }
      Transforms.wrapNodes(editor, block)
    }
  }
}

export const toggleMark = (editor: Editor, format: keyof CustomText): void => {
  const isActive = isMarkActive(editor, format)

  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

export const isBlockActive = (editor: Editor, format: CustomElementType): boolean => {
  const [match] = Editor.nodes(editor, {
    match: n =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  })

  return !!match
}

export const isMarkActive = (editor: Editor, format: keyof CustomText): boolean => {
  const marks = Editor.marks(editor)
  return marks ? format in marks === true : false
}

export const getActiveBlock = (editor: Editor, formats: CustomElementType[]): CustomElementType | undefined => {
  return formats.find(format => isBlockActive(editor, format))
}

const HOTKEYS: Record<string, keyof CustomText> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
}

export const handleHotkeys = (editor: Editor) => (event: KeyboardEvent<HTMLDivElement>): void => {
  for (const hotkey in HOTKEYS) {
    if (isHotkey(hotkey, event)) {
      event.preventDefault()
      const mark = HOTKEYS[hotkey]
      toggleMark(editor, mark)
    }
  }
}