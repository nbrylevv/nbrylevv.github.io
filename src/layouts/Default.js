import React, { Component } from 'react';
import './default.scss';

export default class LayoutDefault extends Component {
  render() {
    return (
      <div className="layout default-layout">
        {this.props.children}
      </div>
    );
  }
}