import React from 'react'
import Link from 'next/link'
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material'
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import { useNotesList } from './hooks'
import {v4 as uuidv4} from 'uuid';

interface NotesListProps {
  activeNoteId?: string
}

const NotesList: React.FC<NotesListProps> = ({ activeNoteId }) => {
  const { notesList } = useNotesList()

  return (
    <List>
      {notesList?.map((note) => (
        <Link href={`/notes/${note.id}`} key={note.id}>
          <ListItemButton selected={note.id === activeNoteId}>
            <ListItemIcon>
              <AssignmentIcon />
            </ListItemIcon>
            <ListItemText primary={note.title} />
          </ListItemButton>
        </Link>
      ))}
      <ListItemButton onClick={() => {
        window.location.href = `/notes/${uuidv4()}`
      }}>
        <ListItemIcon>
          <AddIcon />
        </ListItemIcon>
        <ListItemText primary="Add Note" />
      </ListItemButton>
    </List>
  )
}

export default NotesList