import React, { Component } from "react";
import Navigation from "../Navigation/index"

export default class Sidebar extends Component {
  render() {
    return (
      <aside className="sidebar">
        <Navigation/>
      </aside>
    );
  }
}