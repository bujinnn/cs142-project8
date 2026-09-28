import React from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Typography, Box, Card, CardMedia, CardContent, Divider, Button, Grid } from "@mui/material";
import "./styles.css";

class UserDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      mentionedPhotos: [], 
    };
  }

  loadData = () => {
    const { userId } = this.props.match.params;
    axios.get(`/user/${userId}`)
      .then((res) => {
        this.setState({ user: res.data });
        if (this.props.handler) {
          this.props.handler(`${res.data.first_name} ${res.data.last_name}`, "");
        }
      })
      .catch(err => console.error("User fetch error:", err));
    axios.get(`/photosOfMention/${userId}`)
      .then((res) => {
        this.setState({ mentionedPhotos: res.data });
      })
      .catch(err => console.error("Mentioned photos fetch error:", err));
  };

  componentDidMount() {
    this.loadData();
  }

  componentDidUpdate(prevProps) {
    const oldId = prevProps.match.params.userId;
    const newId = this.props.match.params.userId;
    if (oldId !== newId) {
      this.loadData();
    }
  }

  handleDeleteAccount = () => {
    const confirmed = window.confirm("АНХААРУУЛГА: Та аккаунтаа устгахдаа итгэлтэй байна уу? Таны бүх зураг болон сэтгэгдэл бүрмөсөн устах болно!");
    if (confirmed) {
      axios.post("/deleteUser", {})
        .then(() => {
          window.location.href = "/photo-share.html#/login-register";
        })
        .catch((err) => {
          console.error(err);
          alert("Алдаа гарлаа.");
        });
    }
  };
  render() {
    const { user, mentionedPhotos } = this.state;
    const isCurrentUser = this.props.currentUser && this.props.currentUser._id === this.props.match.params.userId;
    if (!user) return <Typography sx={{ p: 2 }}>Loading...</Typography>;
    return (
      <Box className="userDetail-container" sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {user.first_name} {user.last_name}
        </Typography>
        <Typography variant="h6" color="text.secondary">Occupation: {user.occupation}</Typography>
        <Typography variant="body1" sx={{ mt: 1 }}><b>Location:</b> {user.location}</Typography>
        <Typography variant="body1"><b>Description:</b> {user.description}</Typography>
        <Divider sx={{ my: 4 }} />
        <Typography variant="h6" gutterBottom>Статистик зургууд</Typography>
        <Grid container spacing={2}>
          {user.recent_photo && (
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ boxShadow: 2 }}>
                <Link to={`/photos/${user._id}`}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={`/images/${user.recent_photo.file_name}`}
                    alt="Recent"
                  />
                </Link>
                <CardContent>
                  <Typography variant="subtitle2" color="primary">Хамгийн сүүлийн зураг</Typography>
                  <Typography variant="caption">
                    {new Date(user.recent_photo.date_time).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {user.most_commented_photo && (
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ boxShadow: 2 }}>
                <Link to={`/photos/${user._id}`}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={`/images/${user.most_commented_photo.file_name}`}
                    alt="Most Commented"
                  />
                </Link>
                <CardContent>
                  <Typography variant="subtitle2" color="secondary">Их сэтгэгдэлтэй зураг</Typography>
                  <Typography variant="caption">
                    Сэтгэгдэл: {user.most_commented_photo.comment_count}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
        <Typography variant="h6" className="mentioned-section-title" sx={{ mt: 5, mb: 2 }}>Дурдагдсан зургууд (Mentioned In)</Typography>
        {mentionedPhotos.length > 0 ? (
            <Grid container spacing={3}>
                {mentionedPhotos.map((photo) => (
                    <Grid item key={photo._id} xs={6} sm={4} md={2.4}> {/* 5 зураг нэг эгнээнд */}
                        <Card className="mention-card">
                            <Link to={`/photos/${photo.user_id}`}>
                                <CardMedia
                                    component="img"
                                    height="120"
                                    image={`/images/${photo.file_name}`}
                                    className="mention-card-media"
                                />
                            </Link>
                            <Box className="mention-owner-box">
                                <Link to={`/users/${photo.user_id}`} className="mention-owner-link">
                                    Owner: View Profile
                                </Link>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        ) : (
            <Typography variant="body2" className="no-mentions-text">
                Энэ хэрэглэгч ямар нэг зураг дээр дурдагдаагүй байна.
            </Typography>
        )}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="contained" component={Link} to={`/photos/${user._id}`}>
            Бүх зургийг үзэх
          </Button>
          {isCurrentUser && (
            <Button
              variant="outlined"
              color="error"
              onClick={this.handleDeleteAccount}
            >
              Аccount устгах
            </Button>
          )}
        </Box>
      </Box>
    );
  }
}

export default UserDetail;