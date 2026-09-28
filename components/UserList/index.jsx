import React from "react";
import { Link, withRouter } from "react-router-dom";
import { Typography, List, ListItemText, Divider, ListItem, Badge, Box } from "@mui/material";
import axios from "axios";
import "./styles.css";

class UserList extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      users: [], 
      loadingExtra: false,
    };
  }
  loadUser = async (extraMode) => {
    try {
        const res = await axios.get("/user/list");
        let userList = res.data;
        if (extraMode) {
            this.setState({ loadingExtra: true });
            const userPromises = userList.map(user =>  axios.get(`/user/${user._id}`)
            );
            const detailResponses = await Promise.all(userPromises);
            userList = userList.map((user, index) => {
                const detail = detailResponses[index].data;
                return {
                    ...user,
                    num_photos: detail.num_photos,
                    num_comments: detail.num_comments,
                };
            });
            this.setState({ loadingExtra: false });
        }
        this.setState({ users: userList });
    } catch (error) {
        console.error("Error fetching user list or extra data:", error);
    }
  };
  componentDidMount(){
    this.loadUser(this.props.extraMode);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.extraMode !== this.props.extraMode) {
        this.loadUser(this.props.extraMode);
    }
  }
  render() {
    const { users, loadingExtra } = this.state;
    const { extraMode, currentUser } = this.props;
    if (!users || (extraMode && loadingExtra)) {
        return <Typography>Loading...</Typography>;
    }
    return (
      <div className="userList-container">
       <Typography variant="h6">User List</Typography>
        <List component="nav">
          {users.map((user) => {
            const isMe = currentUser && user._id === currentUser._id;
            return (
            <ListItem key={user._id} divider>
              <ListItemText
                primary={ <Link to={`/users/${user._id}`}>{isMe  ? `${user.first_name} ${user.last_name} (Me)` : `${user.first_name} ${user.last_name}`}</Link>}
              />
              {extraMode && (
                <Box sx={{ display: "flex", gap: 1 }}> 
                  <Badge badgeContent={user.num_photos} color="success">
                    <Box sx={{ width: 15, height: 15, borderRadius: '50%' }} /> 
                  </Badge>
                  <Link to={`/comments/${user._id}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                    <Badge badgeContent={user.num_comments} color="error">
                      <Box sx={{ width: 15, height: 15, borderRadius: '50%' }} />
                    </Badge>
                  </Link>
                </Box>
              )}
              {extraMode && user.last_activity && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, ml: 2, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'gray' }}>
                    {user.last_activity.type}
                  </Typography>
                  {user.last_activity.file_name && (
                    <img 
                      src={`/images/${user.last_activity.file_name}`} 
                      style={{ 
                        width: '35px', 
                        height: '35px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        border: '1px solid #ddd' 
                      }} 
                      alt="recent activity"
                    />
                  )}
                </Box>
              )}
            </ListItem>
            );
          })}
          <Divider />
        </List>
      </div>
    );
  }
}
export default withRouter(UserList);