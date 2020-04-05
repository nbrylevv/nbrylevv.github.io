import React from 'react';
import Sidebar from './components/Sidebar/index';
import './App.scss';
import LayoutDefault from './layouts/Default';
import ProjectCard from './components/ProjectCard';

function App() {
  return (
    <div className="app">
      <Sidebar />
      <LayoutDefault>
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
        <ProjectCard />
      </LayoutDefault>
    </div>
  );
}

export default App;
