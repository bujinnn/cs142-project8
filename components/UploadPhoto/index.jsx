import React from 'react';
import axios from 'axios';
import { Button, Input, Box, Typography, Alert } from '@mui/material';
import "./styles.css";
class UploadPhoto extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedFile: null,
      message: '',
      error: '',
    };
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
  }
  handleFileChange(event) {
    this.setState({ selectedFile: event.target.files[0], message: '', error: '' });
  }
  handleUpload(event) {
    event.preventDefault();
    const { selectedFile } = this.state;
    const { user, history, refreshUserList } = this.props;
    if (!selectedFile) {
      this.setState({ error: 'Зураг сонгоно уу.', message: '' });
      return;
    }
    const formData = new FormData();
    formData.append('uploadedphoto', selectedFile); 
    axios.post('/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(() => { this.setState({ message: 'Зураг амжилттай нэмэгдлээ!', error: '', selectedFile: null });
      if (refreshUserList) {
        refreshUserList();
      }
      setTimeout(() => {
        history.push(`/photos/${user._id}`);
      }, 1000);
    })
    .catch(error => {
      const errorMsg = error.response?.data?.message || error.response?.data || 'Зураг оруулахад алдаа гарлаа.';
      this.setState({ error: errorMsg, message: '' });
      console.error('Upload Error:', error);
    });
  }
  render() {
    const { message, error, selectedFile } = this.state;
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Зураг оруулах
        </Typography>
        <form onSubmit={this.handleUpload}>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={this.handleFileChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          {selectedFile && (
             <Typography variant="body1" sx={{ mb: 2 }}>
                Сонгосон файл: **{selectedFile.name}**
             </Typography>
          )}

          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={!selectedFile}
          >
            Зургаа нэмэх
          </Button>
        </form>

        {message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }
}

export default UploadPhoto;