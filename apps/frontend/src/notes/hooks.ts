import { useCallback, useContext } from 'react';
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useState, useEffect } from 'react';
import { NoteResponse } from '../../../backend/routes/notes';

import { ReadyState } from 'react-use-websocket';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { NotesContext } from '../layout/Interface';

export const useNotesList = () => {
  const [notes, setNotes] = useState<NoteResponse[]>([])
  const [yMenu, setYMenu] = useState<Y.Map<string> | undefined>()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const yDoc = new Y.Doc();
      const yMenu = yDoc.getMap<string>('all');

      const provider = new WebsocketProvider(
        `ws://localhost:3001/api/notes`,
        'all',
        yDoc
      );

      setYMenu(yMenu)

      return () => provider.destroy()
    }
  }, [])

  useEffect(() => {
    if (yMenu) {
      const menuChangeHandler = () => {
        const notes: NoteResponse[] = []
        yMenu.forEach((title, id) => notes.push({ id, title }))
        setNotes(notes)
      }

      yMenu.observe(menuChangeHandler)
      return () => yMenu.unobserve(menuChangeHandler)
    }
  }, [yMenu])

  const error = false

  return {
    notesList: notes,
    isLoading: !error && !yMenu,
    isError: error,
  };
};

export const useNote = (id: string) => {
  const [yContent, setYContent] = useState<Y.XmlText | undefined>()
  const [yTitle, setYTitle] = useState<Y.Text | undefined>()
  const [title, setTitle] = useState('')
  const [wsReadyState, setWsReadyState] = useState<number>(-1);
  const [length, setLength] = useState(0);
  const { users, setUsers } = useContext(NotesContext)

  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const yDoc = new Y.Doc();
      const yContent = yDoc.get('content', Y.XmlText) as Y.XmlText;
      const yTitle = yDoc.getText('title')

      setYContent(yContent)
      setYTitle(yTitle)

      const handleLengthChange = () => {
        setLength(yContent.length);
      };
      yContent.observe(handleLengthChange);

      setTitle(yTitle.toString())
      
      const handleTitleChange = (yTextEvent: Y.YTextEvent) => {
        setTitle(yTextEvent.target.toString())
      }
      yTitle.observe(handleTitleChange)

      const provider = new WebsocketProvider(
        `ws://localhost:3001/api/notes`,
        id,
        yDoc
      );

      provider.awareness.on('change', ({added, removed}: { added: number[], updated: number[], removed: number[]}) => {
        const _users: number[] = [
          ...users || [],
        ]

        added.forEach(u => _users.push(u))
        removed.forEach(u => _users.indexOf(u) && _users.splice(_users.indexOf(u), 1))
        setUsers && setUsers(_users)
      })

      const handler = () =>
        setWsReadyState(provider.ws?.readyState || WebSocket.CLOSED);
      provider.on('status', handler);

      return () => {
        yContent.unobserve(handleLengthChange)
        yTitle.unobserve(handleTitleChange)
        provider.destroy()
        setUsers && setUsers([])
      };
    }
  }, [id]);

  let readyState = ReadyState.UNINSTANTIATED;

  if (wsReadyState >= 0) {
    if (wsReadyState !== WebSocket.OPEN) {
      readyState = wsReadyState;
    } else {
      if (length === 0) {
        readyState = ReadyState.CONNECTING;
      } else {
        readyState = ReadyState.OPEN;
      }
    }
  }

  const updateTitle: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback((event) => {
    if (yTitle) {
      yTitle.delete(0, yTitle.toString().length)
      yTitle.insert(0, event.currentTarget.value)
    }
  }, [yTitle]);

  const note: NoteResponse = {
    id,
    title,
    content: yContent,
  }

  return {
    note,
    readyState,
    updateTitle,
    users,
  };
};
