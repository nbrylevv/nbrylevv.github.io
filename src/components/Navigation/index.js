import React, { Component } from 'react';

export default class Navigation extends Component {
  render() {
    return (
      <nav className="navigation">
        <a className="navigation__link"
           href="/home">
          Home
        </a>
        <a className="navigation__link"
           href="/projects">
          Projects
        </a>
        <a className="navigation__link"
           href="/cv">
          CV
        </a>
      </nav>
    );
  }
}