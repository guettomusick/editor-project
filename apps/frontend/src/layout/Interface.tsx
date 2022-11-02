import React, { createContext, Dispatch, SetStateAction, useState } from 'react'
import { Toolbar, Typography, Drawer, Divider, Box, Container } from '@mui/material'
import { NotesList } from '../notes'
import UsersList from '../notes/UsersList'

const drawerWidth = 240

interface InterfaceProps {
  activeNoteId?: string
}

type NotesContextProps = {
  users?: number[],
  setUsers?: Dispatch<SetStateAction<number[]>>
}

export const NotesContext = createContext<NotesContextProps>({});

const Interface: React.FC<InterfaceProps> = ({ activeNoteId, children }) => {
  const [users, setUsers] = useState<number[]>([])

  return (
    <NotesContext.Provider value={{ users, setUsers }}>
      <Box sx={{ display: 'flex' }}>
        <Drawer variant="permanent" sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}>
          <Toolbar>
            <Typography
              component="h1"
              variant="h6"
              color="inherit"
              noWrap
              sx={{ flexGrow: 1 }}
            >
              Notes
            </Typography>
          </Toolbar>
          <Divider />
          <NotesList activeNoteId={activeNoteId} />
          <Divider />
          <UsersList />
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            backgroundColor: '#eee',
            overflow: 'auto',
          }}
        >
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {children}
          </Container>
        </Box>
      </Box>
    </NotesContext.Provider>
  )
}

export default Interface