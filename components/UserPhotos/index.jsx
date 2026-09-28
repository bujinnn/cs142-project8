import React from "react";
import axios from "axios";
import { Typography, Button, Box, Card, CardContent, CardMedia, IconButton, Divider, TextField, Paper, MenuItem } from "@mui/material";
import { Link } from "react-router-dom";
import "./styles.css";

class UserPhotos extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      photos: [],
      allUsers: [],
      newCommentText: {},
      showMentionList: null,
      mentionSearch: "",
    };
    this.cancelTokenSource = axios.CancelToken.source();
  }

  loadData(userId){
    axios.get("/user/list").then(res => {
      const users = res.data.map(u => ({ id: u._id, display: `${u.first_name} ${u.last_name}` }));
      this.setState({ allUsers: users });
    }).catch(err => console.error("User list error:", err));
    axios.get(`/user/${userId}`, { cancelToken: this.cancelTokenSource.token })
      .then((userRes) => {
        this.props.handler(`Photos of ${userRes.data.first_name} ${userRes.data.last_name}`, "");
        return axios.get(`/photosOfUser/${userId}`, { cancelToken: this.cancelTokenSource.token });
      })
      .then((photosRes) => {
        this.setState({ photos: photosRes.data }, () => {
          this.checkExtraModeIndex(userId);
        });
      })
      .catch((err) => {
        if (!axios.isCancel(err)) console.error("Error fetching data:", err);
      });
  }
  checkExtraModeIndex(userId){
    const { extraMode, match, history } = this.props;
    if (extraMode && !match.params.photoIndex && this.state.photos.length > 0) {
      history.replace(`/photos/${userId}/0`);
    }
  }
  componentDidMount() {
    this.loadData(this.props.match.params.userId);
  }
  componentDidUpdate(prevProps) {
    const { userId } = this.props.match.params;
    if (prevProps.match.params.userId !== userId) {
      this.loadData(userId);
    }
    if (!prevProps.extraMode && this.props.extraMode) {
      this.checkExtraModeIndex(userId);
    }
  }

  componentWillUnmount() {
    this.cancelTokenSource.cancel('Component unmounted');
  }
  handleCommentChange(photoId, text){
    this.setState(prevState => ({
      newCommentText: { ...prevState.newCommentText, [photoId]: text }
    }));
    const words = text.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) {
      this.setState({ showMentionList: photoId, mentionSearch: lastWord.substring(1) });
    } else {
      this.setState({ showMentionList: null });
    }
  }

  selectUser(photoId, user){
    const currentText = this.state.newCommentText[photoId] || "";
    const words = currentText.split(" ");
    words.pop();
    const newText = [...words, `@[${user.display}](${user.id})`].join(" ") + " ";
    this.setState(prevState => ({
      newCommentText: { ...prevState.newCommentText, [photoId]: newText },
      showMentionList: null
    }));
  }

  handleLikeToggle (photoId){
    axios.post(`/like/${photoId}`, {}).then(() => this.loadData(this.props.match.params.userId));
  }

  handleDeletePhoto = (photoId) => {
    if (window.confirm("Та энэ зургийг устгахдаа итгэлтэй байна уу?")) {
      axios.post(`/deletePhoto/${photoId}`).then(() => {
        if (this.props.extraMode) this.props.history.push(`/photos/${this.props.match.params.userId}/0`);
        this.loadData(this.props.match.params.userId);
      });
    }
  };
  handleDeleteComment(commentId, photoId){
    if (window.confirm("Та энэ сэтгэгдлийг устгахдаа итгэлтэй байна уу?")) {
      axios.post(`/deleteComment/${commentId}`, { photoId }).then(() => {
        this.loadData(this.props.match.params.userId);
      }).catch(err => console.error("Delete comment error:", err));
    }
  }
  handlePostComment (photoId){
    const text = this.state.newCommentText[photoId];
    if (!text?.trim()) return;

    axios.post(`/commentsOfPhoto/${photoId}`, { comment: text }).then(() => {
      this.loadData(this.props.match.params.userId);
      this.setState(prevState => ({ newCommentText: { ...prevState.newCommentText, [photoId]: "" } }));
    });
  }
  formatComment(text){
    if (!text) return "";
    return text.split(/(@\[.+?\]\(.+?\))/g).map((part, i)=>{
      const m = part.match(/@\[(.+?)\]\((.+?)\)/);
      return m ? <Link key={i} to={`/users/${m[2]}`} className="mention-link" style={{color: '#1976d2', fontWeight: 'bold'}}>@{m[1]}</Link> : part;
    });
  }

  renderPhotoCard = (photo) => {
    const { extraMode, currentUser } = this.props;
    const { newCommentText, showMentionList, allUsers, mentionSearch } = this.state;
    if (!photo) return null;
    const imageSrc = extraMode ? `/images/extra_${photo.file_name}` : `/images/${photo.file_name}`;
    return (
      <Card key={photo._id} sx={{ mb: 4, overflow: 'visible' }}>
        <CardMedia 
            component="img" 
            image={imageSrc} 
            className={extraMode ? "photo-media-extra" : "photo-media-regular"} 
            onError={(e) => { e.target.src = `/images/${photo.file_name}`; }} 
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => this.handleLikeToggle(photo._id)}>
                {photo.likes?.includes(currentUser?._id) ? "❤️" : "🤍"}
              </IconButton>
              <Typography variant="subtitle2">{photo.likes?.length || 0} Likes</Typography>
            </Box>
            {currentUser?._id === photo.user_id && (
              <Button size="small" color="error" variant="outlined" onClick={() => this.handleDeletePhoto(photo._id)}>Зураг устгах</Button>
            )}
          </Box>
          <Divider sx={{ my: 1 }} />
          {photo.comments?.map(c => (
            <Box key={c._id} sx={{ mb: 1.5, p: 1.5, bgcolor: '#f4f6f8', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/users/${c.user._id}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: '#1976d2' }}>
                  {c.user.first_name} {c.user.last_name}
                </Link>
                {currentUser?._id === c.user._id && (
                  <Button 
                    size="small" 
                    color="error" 
                    sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                    onClick={() => this.handleDeleteComment(c._id, photo._id)}
                  >
                    Устгах
                  </Button>
                )}
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{this.formatComment(c.comment)}</Typography>
              <Typography variant="caption" color="textSecondary">{new Date(c.date_time).toLocaleString()}</Typography>
            </Box>
          ))}

          <Box sx={{ mt: 2, position: 'relative' }}>
            <TextField 
                fullWidth size="small" multiline rows={2}
                placeholder="Сэтгэгдэл бичих... (@ ашиглан mention хийж болно)" 
                value={newCommentText[photo._id] || ""} 
                onChange={(e) => this.handleCommentChange(photo._id, e.target.value)} 
            />
            {showMentionList === photo._id && (
              <Paper className="mention-popover" sx={{ position: 'absolute', zIndex: 10, width: '100%', maxHeight: 200, overflow: 'auto' }}>
                {allUsers.filter(u => u.display.toLowerCase().includes(mentionSearch.toLowerCase())).map(u => (
                  <MenuItem key={u.id} onClick={() => this.selectUser(photo._id, u)}>{u.display}</MenuItem>
                ))}
              </Paper>
            )}
            <Button variant="contained" size="small" sx={{ mt: 1 }} onClick={() => this.handlePostComment(photo._id)}>Илгээх</Button>
          </Box>
        </CardContent>
      </Card>
    );
  };
  render() {
    const { photos } = this.state;
    const { extraMode, history, match } = this.props;
    const { userId, photoIndex } = match.params;
    if (!photos.length) return <Typography sx={{ p: 2 }}>Зураг байхгүй</Typography>;
    const index = parseInt(photoIndex || "0", 10);
    const displayPhotos = extraMode ? [photos[index]] : photos;
    return (
      <Box className="userPhotos-container" sx={{ p: 2, maxWidth: 800, margin: 'auto' }}>
        {extraMode && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center', bgcolor: '#fff', p: 1, borderRadius: 1, boxShadow: 1 }}>
            <Button variant="outlined" disabled={index === 0} onClick={() => history.push(`/photos/${userId}/${index - 1}`)}>Өмнөх</Button>
            <Typography variant="button" sx={{ fontWeight: 'bold' }}>Зураг: {index + 1} / {photos.length}</Typography>
            <Button variant="outlined" disabled={index === photos.length - 1} onClick={() => history.push(`/photos/${userId}/${index + 1}`)}>Дараах</Button>
          </Box>
        )}
        {displayPhotos.map(this.renderPhotoCard)}
      </Box>
    );
  }
}

export default UserPhotos;
