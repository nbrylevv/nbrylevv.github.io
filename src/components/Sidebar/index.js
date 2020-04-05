import React, { Component } from "react";
import Navigation from "../Navigation/index"

import './index.scss';

export default class Sidebar extends Component {
  render() {
    return (
      <aside className="sidebar">
        <div className="sidebar__photo"></div>
        <Navigation className="sidebar__navigation" />
      </aside>
    );
  }
}