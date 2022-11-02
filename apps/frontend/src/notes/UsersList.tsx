import { FC, useContext } from 'react'
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import { NotesContext } from '../layout/Interface';


const UsersList: FC = () => {
  const { users } = useContext(NotesContext)
  const totalUsers = 
    !users || users?.length === 0 ? 'No other users editing' : `${users.length} user${users.length > 1 ? 's' : ''} connected`

  return (
    <List>
      <ListItem>
        <ListItemIcon>
          <GroupIcon />
        </ListItemIcon>
        <ListItemText primary={totalUsers} />
      </ListItem>
      {users?.map((user) => (
        <ListItem key={user}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary={user} />
        </ListItem>
      ))}
    </List>
  )
}

export default UsersList