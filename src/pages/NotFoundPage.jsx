import React from 'react';
import { useNavigate } from 'react-router-dom';
import StyledWrapper from './NotFoundPage.styles';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoHome = (e) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <StyledWrapper>
      <div className="container">
        <div className="messages">
          <p className="message m1">
            <span className="word"><span className="letter">H</span><span className="letter">e</span><span className="letter">y</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">h</span><span className="letter">e</span><span className="letter">r</span><span className="letter">e</span><span className="letter">!</span></span>
          </p>
          <p className="message m2">
            <span className="word"><span className="letter">S</span><span className="letter">o</span><span className="letter">u</span><span className="letter">n</span><span className="letter">d</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">l</span><span className="letter">i</span><span className="letter">k</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">y</span><span className="letter">o</span><span className="letter">u</span><span className="letter">'</span><span className="letter">r</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">l</span><span className="letter">o</span><span className="letter">s</span><span className="letter">t</span><span className="letter">!</span></span>
          </p>
          <p className="message m3">
            <span className="word"><span className="letter">B</span><span className="letter">e</span><span className="letter">c</span><span className="letter">a</span><span className="letter">u</span><span className="letter">s</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">h</span><span className="letter">i</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">i</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">h</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">"</span><span className="letter">N</span><span className="letter">o</span><span className="letter">t</span><span className="letter"> </span><span className="letter">F</span><span className="letter">o</span><span className="letter">u</span><span className="letter">n</span><span className="letter">d</span><span className="letter">"</span></span>
            <span className="word"><span className="letter">p</span><span className="letter">a</span><span className="letter">g</span><span className="letter">e</span><span className="letter">.</span></span>
          </p>
          <p className="message m4">
            <span className="word"><span className="letter">M</span><span className="letter">a</span><span className="letter">n</span><span className="letter">,</span></span>
            <span className="word"><span className="letter">i</span><span className="letter">t</span><span className="letter">'</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">a</span><span className="letter">l</span><span className="letter">w</span><span className="letter">a</span><span className="letter">y</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">s</span><span className="letter">o</span></span>
            <span className="word"><span className="letter">d</span><span className="letter">a</span><span className="letter">r</span><span className="letter">k</span></span>
            <span className="word"><span className="letter">h</span><span className="letter">e</span><span className="letter">r</span><span className="letter">e</span><span className="letter">.</span><span className="letter">.</span><span className="letter">.</span></span>
          </p>
          <p className="message m5">
            <span className="word"><span className="letter">L</span><span className="letter">e</span><span className="letter">t</span></span>
            <span className="word"><span className="letter">m</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">u</span><span className="letter">r</span><span className="letter">n</span></span>
            <span className="word"><span className="letter">o</span><span className="letter">n</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">h</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">l</span><span className="letter">i</span><span className="letter">g</span><span className="letter">h</span><span className="letter">t</span><span className="letter">.</span></span>
          </p>
          <p className="message m6">
            <span className="word"><span className="letter">I</span></span>
            <span className="word"><span className="letter">g</span><span className="letter">u</span><span className="letter">e</span><span className="letter">s</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">i</span></span>
            <span className="word"><span className="letter">s</span><span className="letter">h</span><span className="letter">o</span><span className="letter">u</span><span className="letter">l</span><span className="letter">d</span></span>
            <span className="word"><span className="letter">c</span><span className="letter">h</span><span className="letter">a</span><span className="letter">n</span><span className="letter">g</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">h</span><span className="letter">i</span><span className="letter">s</span></span>
            <span className="word"><span className="letter">l</span><span className="letter">a</span><span className="letter">m</span><span className="letter">p</span><span className="letter">.</span><span className="letter">.</span><span className="letter">.</span></span>
          </p>
          <p className="message m7">
            <span className="word"><span className="letter">H</span><span className="letter">e</span><span className="letter">r</span><span className="letter">e</span><span className="letter">!</span></span>
          </p>
          <p className="message m8">
            <span className="word"><span className="letter">J</span><span className="letter">u</span><span className="letter">s</span><span className="letter">t</span></span>
            <span className="word"><span className="letter">r</span><span className="letter">e</span><span className="letter">t</span><span className="letter">u</span><span className="letter">r</span><span className="letter">n</span></span>
            <span className="word"><span className="letter">t</span><span className="letter">o</span></span>
            <span className="word"><span className="letter">h</span><span className="letter">o</span><span className="letter">m</span><span className="letter">e</span></span>
            <span className="word"><span className="letter">p</span><span className="letter">a</span><span className="letter">g</span><span className="letter">e</span><span className="letter">.</span></span>
          </p>
          <p className="message m9">
            <span className="word"><span className="letter">A</span><span className="letter">n</span><span className="letter">d</span></span>
            <span className="word"><span className="letter">d</span><span className="letter">o</span><span className="letter">n</span><span className="letter">'</span><span className="letter">t</span></span>
            <span className="word"><span className="letter">g</span><span className="letter">e</span><span className="letter">t</span></span>
            <span className="word"><span className="letter">l</span><span className="letter">o</span><span className="letter">s</span><span className="letter">t</span></span>
            <span className="word"><span className="letter">a</span><span className="letter">g</span><span className="letter">a</span><span className="letter">i</span><span className="letter">n</span></span>
            <span className="word"><span className="letter">:)</span></span>
          </p>
          <p className="not-found-message"><span className="text">Not Found</span></p>
          <div className="grid gr-1" />
          <div className="grid gr-2" />
          <div className="grid gr-3" />
          <div className="grid gr-4" />
        </div>
        <a href="/" onClick={handleGoHome} className="go-home">
          <span className="text">Go Home</span>
          <span className="glow g1" />
          <span className="glow g2" />
          <span className="glow g3" />
          <span className="glow g4" />
        </a>
        <div className="light">
          <span className="blocker" />
          <span className="blocker" />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default NotFoundPage;
