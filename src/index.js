import React from 'react';
import ReactDOM from 'react-dom';
import './index.css'
// import Cont2 from './Cont2';
import ContentScript from './ContentScript';

const elem = document.createElement('div');
document.body.appendChild(elem);

ReactDOM.render(
  <React.StrictMode>
    <ContentScript />
  </React.StrictMode>,
  elem
);
