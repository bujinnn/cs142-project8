import React from 'react';
import { Button, TextField, Typography, Paper, Box, Alert } from '@mui/material';
import axios from 'axios';
import './styles.css';

class LoginRegister extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLogin: true, 
            loginName: '',
            loginPassword: '',
            loginError: null,
            regLoginName: '',
            regPassword: '',
            regPasswordConfirm: '',
            regFirstName: '',
            regLastName: '',
            regLocation: '',
            regDescription: '',
            regOccupation: '',
            registerError: null,
            registerSuccess: null,
        };
        this.handleLogin = this.handleLogin.bind(this);
        this.handleRegister = this.handleRegister.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.solix = this.solix.bind(this);
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this.setState({ [name]: value });
    }

    solix() {
        this.setState(prevState => ({
            isLogin: !prevState.isLogin,
            loginError: null,
            registerError: null,
            registerSuccess: null
        }));
    }
    handleLogin() {
        this.setState({ loginError: null }); 
        axios.post('/admin/login', {
            login_name: this.state.loginName,
            password: this.state.loginPassword 
        })
        .then(response => {
            this.props.onLogin(response.data); 
        })
        .catch(error => {
            const errorMsg = error.response?.data || "Нэвтрэх нэр эсвэл нууц үг буруу байна.";
            this.setState({ loginError: errorMsg });
        });
    }
    handleRegister() {
        this.setState({ registerError: null, registerSuccess: null }); 
        const { regPassword, regPasswordConfirm, regLoginName, regFirstName, regLastName, regLocation, regDescription, regOccupation } = this.state;
        
        if (regPassword !== regPasswordConfirm) {
            this.setState({ registerError: "Нууц үг болон баталгаажуулах нууц үг таарахгүй байна." });
            return;
        }
        const registrationData = {
            login_name: regLoginName,
            password: regPassword,
            first_name: regFirstName,
            last_name: regLastName,
            location: regLocation,
            description: regDescription,
            occupation: regOccupation,
        };
        axios.post('/user', registrationData)
        .then(response => {
            this.setState({ 
                registerSuccess: `Хэрэглэгч ${response.data.login_name} амжилттай бүртгэгдлээ! Одоо нэвтэрнэ үү.`,
                isLogin: true, 
                regLoginName: '', 
                regPassword: '', 
                regPasswordConfirm: '', 
                regFirstName: '', 
                regLastName: '', 
                regLocation: '', 
                regDescription: '', 
                regOccupation: ''
            });
        })
        .catch(error => {
            const errorMsg = error.response?.data || "Бүртгэл хийх үед алдаа гарлаа.";
            this.setState({ registerError: errorMsg });
        });
    }
    render() {
        const { isLogin } = this.state;

        return (
            <Box className="login-register-container">
                <Paper elevation={6} className="form-paper">
                    {isLogin ? (
                        <Box>
                            <Typography variant="h5" className="form-title">Нэвтрэх</Typography>
                            {this.state.registerSuccess && (
                                <Alert severity="success" sx={{ mb: 2 }}>{this.state.registerSuccess}</Alert>
                            )}
                            <TextField
                                label="Нэвтрэх нэр"
                                name="loginName"
                                value={this.state.loginName}
                                onChange={this.handleInputChange}
                                fullWidth margin="normal" variant="outlined" size="small"
                            />
                            <TextField
                                label="Нууц үг"
                                name="loginPassword"
                                type="password"
                                value={this.state.loginPassword}
                                onChange={this.handleInputChange}
                                fullWidth margin="normal" variant="outlined" size="small"
                            />
                            {this.state.loginError && <Alert severity="error" sx={{ mt: 1 }}>{this.state.loginError}</Alert>}
                            <Button 
                                variant="contained" 
                                fullWidth
                                onClick={this.handleLogin}
                                className="login-button" 
                                sx={{ mt: 3 }}
                            >
                                Нэвтрэх
                            </Button>
                            <Typography sx={{ mt: 3, textAlign: 'center', fontSize: '0.9rem' }}>
                                Бүртгэлгүй юу?{' '}
                                <Button type="button" onClick={this.solix} sx={{ fontWeight: 700, color: 'var(--canva-purple)', textTransform: 'none', padding: 0, minWidth: 'auto', fontSize: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                                    Шинээр бүртгүүлэх
                                </Button>
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="h5" className="form-title">Бүртгүүлэх</Typography>
                            <Typography variant="subtitle2">* Үндсэн мэдээлэл</Typography>
                            <TextField label="* Нэвтрэх нэр" name="regLoginName" value={this.state.regLoginName} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            <TextField label="* Нууц үг" name="regPassword" type="password" value={this.state.regPassword} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            <TextField label="* Нууц үгийг давтах" name="regPasswordConfirm" type="password" value={this.state.regPasswordConfirm} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField label="* Нэр" name="regFirstName" value={this.state.regFirstName} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                                <TextField label="* Овог" name="regLastName" value={this.state.regLastName} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            </Box>

                            <Typography variant="subtitle2" sx={{ mt: 2, color: 'text.secondary' }}>Нэмэлт мэдээлэл</Typography>
                            <TextField label="Оршин суугаа газар" name="regLocation" value={this.state.regLocation} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            <TextField label="Мэргэжил" name="regOccupation" value={this.state.regOccupation} onChange={this.handleInputChange} fullWidth margin="dense" size="small" />
                            <TextField label="Танилцуулга" name="regDescription" value={this.state.regDescription} onChange={this.handleInputChange} fullWidth margin="dense" multiline rows={2} size="small" />
                            
                            {this.state.registerError && <Alert severity="error" sx={{ mt: 2 }}>{this.state.registerError}</Alert>}
                            <Button 
                                variant="contained" 
                                fullWidth
                                onClick={this.handleRegister}
                                className="login-button" 
                                sx={{ mt: 3, background: 'var(--canva-gradient)' }}
                            >
                                Бүртгэл үүсгэх
                            </Button>
                            <Typography sx={{ mt: 2, textAlign: 'center', fontSize: '0.9rem' }}>
                                Аль хэдийн бүртгэлтэй юу?{' '}
                                <Button type="button" onClick={this.solix} sx={{ fontWeight: 700, color: 'var(--canva-purple)', textTransform: 'none', padding: 0, minWidth: 'auto', fontSize: 'inherit', '&:hover': { textDecoration: 'underline' } }}>
                                    Нэвтрэх
                                </Button>
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        );
    }
}
export default LoginRegister;