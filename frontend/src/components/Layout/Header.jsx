import React, { useState, useEffect } from 'react';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBrand } from '../../contexts/BrandContext';
import Sidebar from './Sidebar';
import './Header.css';
import colonelLogo from '../LogoImage/colonel-logo.png';

const Header = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBrand, clearBrand } = useBrand();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem('sidebarOpen');
    if (stored !== null) {
      return stored === 'true';
    }
    return typeof window !== 'undefined' && window.innerWidth > 768;
  });

  const isBrandSelected = selectedBrand && location.pathname.startsWith('/brand/');

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', sidebarOpen.toString());
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSwitchBrand = () => {
    clearBrand();
    navigate('/');
  };

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="colonel-header">
        <Container fluid>
          {isBrandSelected && (
            <Button
              variant="link"
              className="sidebar-toggle-btn me-2"
              onClick={toggleSidebar}
              title={sidebarOpen ? 'Close Sidebar' : 'Open Sidebar'}
            >
              {sidebarOpen ? '✕' : '☰'}
            </Button>
          )}
          
          <Navbar.Brand 
            onClick={() => isBrandSelected ? navigate(`/brand/${selectedBrand.id}`) : navigate('/')}
            style={{ cursor: 'pointer' }}
            className="fw-bold"
          >
            <img
              src={colonelLogo}
              alt="Colonel Automation Platform"
              className="colonel-logo"
            /><span > Colonel Automation Platform</span>
          </Navbar.Brand>
          
          {isBrandSelected && (
            <>
              <Navbar.Toggle aria-controls="basic-navbar-nav" />
              <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="ms-auto">
                  <Navbar.Text className="me-3 d-none d-md-block">
                    Brand: <strong>{selectedBrand.name}</strong>
                  </Navbar.Text>
                  <Nav.Link onClick={handleSwitchBrand} className="d-none d-md-block">
                    Switch Brand
                  </Nav.Link>
                </Nav>
              </Navbar.Collapse>
            </>
          )}
        </Container>
      </Navbar>
      
      <div className="layout-container">
        {isBrandSelected && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        <main className={`main-content ${isBrandSelected && sidebarOpen ? 'with-sidebar' : ''}`}>
          {children}
        </main>
      </div>
    </>
  );
};

export default Header;
