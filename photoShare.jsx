import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { Grid, Paper } from "@mui/material";
import { HashRouter, Route, Switch, Redirect } from "react-router-dom";
import UserComments from "./components/UserComments";
import "./styles/main.css";
import TopBar from "./components/TopBar";
import UserDetail from "./components/UserDetail";
import UserList from "./components/UserList";
import UserPhotos from "./components/UserPhotos";
import LoginRegister from "./components/LoginRegister";
import UploadPhoto from "./components/UploadPhoto";

class PhotoShare extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      info: "Home",
      extraMode: false,
      currentUser: null,
      refreshCount: 0,
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.handleRefreshUserList = this.handleRefreshUserList.bind(this);
  }
  componentDidMount() {
    this.interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response && err.response.status === 401) {
          if (this.state.currentUser) {
            this.setState({ currentUser: null });
          }
          window.location.hash = "#/login";
        }
        return Promise.reject(err);
      }
    );
  }
  componentWillUnmount() {
    axios.interceptors.response.eject(this.interceptor);
  }

  handleChange(text) {
    this.setState({ info: text });
  }

  handleLogin = (user) => {
    this.setState({ currentUser: user });
    window.location.hash = `#/users/${user._id}`;
  };

  handleLogout() {
    axios.post("/admin/logout").finally(() => {
      this.setState({ currentUser: null });
      window.location.hash = "#/login";
    });
  }

  handleRefreshUserList() {
    this.setState((prev) => ({ refreshCount: prev.refreshCount + 1 }));
  }
  render() {
    const { currentUser } = this.state;
    return (
      <HashRouter>
        <div>
          <Grid container spacing={2}>
            <Grid item xs={12}>
            <TopBar
              info={this.state.info}
              extraMode={this.state.extraMode}
              onToggleExtra={(value) => this.setState({ extraMode: value })}
              user={currentUser}
              onLogin={this.handleLogin}
              onLogout={this.handleLogout} 
            />
            </Grid>
            <div className="cs142-main-topbar-buffer" />
            {currentUser && (
              <Grid item sm={3}>
                <Paper className="cs142-main-grid-item">
                  <UserList extraMode={this.state.extraMode} refreshCount={this.state.refreshCount} />
                </Paper>
              </Grid>
            )}
            <Grid item sm={currentUser ? 9 : 12}>
              <Paper className="cs142-main-grid-item">
                <Switch>
                  <Route
                    exact
                    path="/"
                    render={() => <Redirect to={currentUser ? `/users` : "/login"} />}
                  />
                  <Route
                      path="/users/:userId"
                      render={(props) => {
                          if (currentUser) {
                              return <UserDetail {...props} handler={this.handleChange} currentUser={this.state.currentUser}/>;
                          } else {
                              return <Redirect to="/login" />;
                          }
                      }}
                  />
                  <Route
                    path="/photos/:userId/:photoIndex?"
                    render={(props) => {
                          if (currentUser) {
                              return <UserPhotos {...props} handler={this.handleChange} extraMode={this.state.extraMode} refreshUserList={this.handleRefreshUserList} currentUser={this.state.currentUser}/>;
                          } else {
                              return <Redirect to="/login" />;
                          }
                    }}
                  />
                  <Route
                    path="/comments/:userId"
                    render={(props) => {
                          if (currentUser) {
                              return <UserComments {...props}  />;
                          } else {
                              return <Redirect to="/login" />;
                          }
                    }}
                  />
                  <Route
                    path="/commentsOfUser/:userId"
                    component={UserComments}
                  />
                  <Route
                    path="/login"
                    render={() => {
                      if (currentUser) {
                        return <Redirect to={`/users/${currentUser._id}`} />;
                      }
                      return <LoginRegister onLogin={this.handleLogin} />;
                    }}
                  />
                  <Route
                    path="/upload"
                    render={(props) => {
                          if (currentUser) {
                              return < UploadPhoto {...props} user={currentUser} refreshUserList={this.handleRefreshUserList} />;
                          } else {
                              return <Redirect to="/login" />;
                          }
                    }}
                  />
                  {!currentUser && <Redirect to="/login" />}
                </Switch>
              </Paper>
            </Grid>
          </Grid>
        </div>
      </HashRouter>
    );
  }
}

ReactDOM.render(<PhotoShare />, document.getElementById("photoshareapp"));