import React, { Component } from 'react';
import './index.scss';

export default class Navigation extends Component {
  render() {
    return (
      <nav className="navigation">
        <ul className="navigation__list">
          <li className="navigation__list-item">
            <a className="navigation__link"
               href="/cv">
              CV
            </a>
          </li>
          <li className="navigation__list-item">
            <a className="navigation__link"
               href="/projects">
              Projects
            </a>
          </li>
        </ul>
      </nav>
    );
  }
}