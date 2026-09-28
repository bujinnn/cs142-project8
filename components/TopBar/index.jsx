import React from "react";
import { AppBar, Toolbar, Typography, FormControlLabel, Checkbox, Button} from "@mui/material"; // Box-ийг нэмж импортлов
import { withRouter } from "react-router-dom";
import axios from "axios";
import "./styles.css";

class TopBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      version: "",
    };
  }
  componentDidMount() {
    axios.get("/test/info").then((res) => {
      this.setState({ version: res.data.__v });
    }).catch(err => console.log(err));
  }
  render() {
    const { info } = this.props;
    return (
      <AppBar className="cs142-topbar-appBar" position="absolute">
        <Toolbar className="topbar-container">
          {this.props.user ? (
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Hi {this.props.user.first_name}
            </Typography>
          ) : (
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Please log in
            </Typography>
          )}
          {this.props.user ? (
            <Button color="inherit" onClick={this.props.onLogout}>
              Logout
            </Button>
          ) : (
            <Button
              color="inherit"
              onClick={() => this.props.history.push("/login")}
            >
              Log in
            </Button>
          )}
          {this.props.user && (
            <Button
              color="inherit"
              onClick={() => this.props.history.push("/upload")}
            >
              Зураг нэмэх
            </Button>
          )}
          <FormControlLabel
            control={
              <Checkbox style={{ color: 'white' }} checked={this.props.extraMode} onChange={(e) => { this.props.onToggleExtra(e.target.checked);}}/>
            }
            label="Advanced"
          />
          <Typography variant="h6" component="span" sx={{ marginLeft: 2, marginRight: 2 }}>
            Version: {this.state.version}
          </Typography>
          <Typography variant="h6" component="span">
            {info}
          </Typography>
        </Toolbar>
      </AppBar>
    );
  }
}
export default withRouter(TopBar);