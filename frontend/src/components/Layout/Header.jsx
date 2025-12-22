import React from 'react';
import { Navbar, Container } from 'react-bootstrap';
import './Header.css';

const Header = ({ children }) => {
  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="colonel-header">
        <Container fluid>
          <Navbar.Brand href="/" className="fw-bold">
            <span className="colonel-logo">⚡</span> Colonel Automation Platform
          </Navbar.Brand>
        </Container>
      </Navbar>
      <main className="main-content">
        {children}
      </main>
    </>
  );
};

export default Header;









