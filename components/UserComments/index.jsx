import React from "react";
import axios from "axios";
import { Typography, Card, Box } from "@mui/material";
import { Link, withRouter } from "react-router-dom";
import "./styles.css";

class UserComments extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      comments: [],
      userName: '',
    };
    this.cancelTokenSource = axios.CancelToken.source(); 
  }
  componentWillUnmount() {
    this.cancelTokenSource.cancel('Operation canceled by the user on unmount.');
  }
  loadUser(userId) {
    axios.get(`/user/${userId}`)
      .then(res => {
        const fullName = `${res.data.first_name} ${res.data.last_name}`;
        this.setState({ userName: fullName });
        if (this.props.handler) {
          this.props.handler(`Comments by ${fullName}`);
        }
      })
      .catch(err => {
        console.error("Error fetching user name:", err);
        if (this.props.handler) {
          this.props.handler(`Comments by User ${userId}`);
        }
      });
  }
  loadComments(userId) {
    this.loadUser(userId);
    axios.get(`/commentsOfUser/${userId}`, {
        cancelToken: this.cancelTokenSource.token 
    })
    .then((res) => {
        this.setState({
          comments: res.data,
        });
    })
    .catch((err) => {
        if (!axios.isCancel(err)) {
             console.error("Error fetching comments:", err);
        }
    });
  }
  componentDidMount() {
    this.loadComments(this.props.match.params.userId);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.match.params.userId !== this.props.match.params.userId) {
      this.loadComments(this.props.match.params.userId);
    }
  }
  render() {
    const { comments, userName } = this.state;
    const { extraMode } = this.props; 
    if (comments.length === 0) {
      return <Typography>No comments found for {userName}.</Typography>;
    }
    return (
      <Box className="user-comments-container">
        <Typography variant="h5" sx={{ mb: 2 }}>
            {userName}-ийн үлдээсэн нийт комментууд {comments.length}
        </Typography>
        {comments.map((c) => {
          const photoId = c.photo_id; 
          const photoUserId = c.photo_user_id;
          const photoLink = (extraMode && photoId) 
            ? `/photos/${photoUserId}/${photoId}` 
            : `/photos/${photoUserId}`;
          return (
            <Card key={c._id} sx={{ mb: 2, p: 2, display: 'flex', alignItems: 'flex-start', border: '1px solid #ddd' }}>
              <Link to={photoLink} style={{ textDecoration: 'none', marginRight: 15 }}>
                <img src={`/images/${c.photo_file_name}`} style={{ width: 100, height: 100}}/>
              </Link>
              <Box onClick={() => this.props.history.push(photoLink)} sx={{ cursor: 'pointer' }}>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {c.comment}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {new Date(c.date_time).toLocaleString()}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>
    );
  }
}
export default withRouter(UserComments);