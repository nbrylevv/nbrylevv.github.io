import React, { Component } from 'react';
import './index.scss';

export default class ProjectCard extends Component {
  render() {
    return (
      <div className="project-card">
        <div className="project-card__title">Название</div>
        <div className="project-card__descr">Описание</div>
        <div className="project-card__image-wrapper">
          <img className="project-card__image" />
        </div>
      </div>
    );
  }
}