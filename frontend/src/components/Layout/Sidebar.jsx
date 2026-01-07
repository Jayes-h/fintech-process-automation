import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Nav, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useBrand } from '../../contexts/BrandContext';
import { brandsApi } from '../../services/agentsApi';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBrand, clearBrand, setSelectedBrand } = useBrand();
  const [isMobile, setIsMobile] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [brandImage, setBrandImage] = useState(null);
  const [brandInfo, setBrandInfo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isBrandSelected = selectedBrand && location.pathname.startsWith('/brand/');
  const brandId = selectedBrand?.id;

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load brand image and info
  useEffect(() => {
    if (brandId) {
      loadBrandDetails();
    }
  }, [brandId]);

  const loadBrandDetails = async () => {
    try {
      setLoading(true);
      const response = await brandsApi.getBrandById(brandId);
      const brandData = response.data || response;
      
      // Set brand image if available (check backend first, then localStorage)
      if (brandData.imageUrl || brandData.logoUrl) {
        setBrandImage(brandData.imageUrl || brandData.logoUrl);
      } else {
        // Check localStorage as fallback
        const storedImage = localStorage.getItem(`brand_image_${brandId}`);
        if (storedImage) {
          setBrandImage(storedImage);
        }
      }
      
      // Store brand info
      setBrandInfo(brandData);
    } catch (err) {
      console.error('Error loading brand details:', err);
      // Try to load from localStorage as fallback
      const storedImage = localStorage.getItem(`brand_image_${brandId}`);
      if (storedImage) {
        setBrandImage(storedImage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isBrandSelected || !brandId) {
    return null;
  }

  const menuItems = [
    {
      path: `/brand/${brandId}`,
      label: 'Home',
      icon: '🏠',
      exact: true
    },
    {
      path: `/brand/${brandId}/inventory`,
      label: 'Inventory',
      icon: '📦'
    },
    {
      path: `/brand/${brandId}/portals`,
      label: 'Portals',
      icon: '🛒'
    },
    {
      path: `/brand/${brandId}/stats`,
      label: 'Stats',
      icon: '📊'
    }
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleSwitchBrand = () => {
    clearBrand();
    navigate('/');
  };

  const handleImageClick = () => {
    setShowImageModal(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    const reader = new FileReader();
    
    reader.onloadend = async () => {
      try {
        const imageData = reader.result;
        setBrandImage(imageData);
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const response = await brandsApi.uploadBrandImage(brandId, formData);
          if (response.success) {
            setSelectedBrand({ ...selectedBrand, imageUrl: response.data.imageUrl });
            setShowImageModal(false);
          }
        } catch (uploadError) {
          console.warn('Backend upload endpoint not available, using localStorage fallback');
          localStorage.setItem(`brand_image_${brandId}`, imageData);
          setSelectedBrand({ ...selectedBrand, imageUrl: imageData });
          setShowImageModal(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to process image');
        console.error('Error processing image:', err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read image file');
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    reader.readAsDataURL(file);
  };

  const handleInfoClick = () => {
    setShowInfoModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      {isOpen && isMobile && (
        <div 
          className="sidebar-overlay"
          onClick={onClose}
        ></div>
      )}
      
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-section">
            <div className="sidebar-profile-container">
              <div 
                className="sidebar-profile-image"
                onClick={handleImageClick}
                title="Click to upload brand photo"
              >
                {brandImage ? (
                  <img src={brandImage.startsWith('http') || brandImage.startsWith('/') ? brandImage : `http://localhost:5000${brandImage}`} alt={selectedBrand.name} />
                ) : (
                  <div className="sidebar-profile-placeholder">
                    <span className="profile-icon">📷</span>
                  </div>
                )}
                <div className="sidebar-profile-overlay">
                  <span className="upload-icon">📤</span>
                </div>
              </div>
            </div>

            <div className="sidebar-brand-info">
              <div className="sidebar-brand-name-row">
                <h5 className="sidebar-brand-name">{selectedBrand.name}</h5>
                <Button
                  variant="link"
                  className="sidebar-info-btn"
                  onClick={handleInfoClick}
                  title="Brand Information"
                >
                  <span className="info-icon">ℹ️</span>
                </Button>
              </div>
              <p className="sidebar-brand-label">Brand Dashboard</p>
            </div>
          </div>
        </div>
        
        <Nav className="flex-column sidebar-nav">
          {menuItems.map((item) => (
            <Nav.Link
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  onClose();
                }
              }}
              className={isActive(item.path, item.exact) ? 'active' : ''}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Nav.Link>
          ))}
          
          <div className="sidebar-divider"></div>
          
          <Nav.Link
            onClick={() => {
              handleSwitchBrand();
              if (isMobile) {
                onClose();
              }
            }}
            className="sidebar-switch-brand"
            title="Switch Brand"
          >
            <span className="sidebar-icon">🔄</span>
            <span className="sidebar-label">Switch Brand</span>
          </Nav.Link>
        </Nav>
      </div>

      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload Brand Photo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          <div className="text-center mb-4">
            {brandImage ? (
              <div className="brand-image-preview">
                <img src={brandImage.startsWith('http') || brandImage.startsWith('/') ? brandImage : `http://localhost:5000${brandImage}`} alt="Brand preview" className="img-fluid rounded" />
              </div>
            ) : (
              <div className="brand-image-placeholder-large">
                <span className="profile-icon-large">📷</span>
                <p className="text-muted mt-2">No image uploaded</p>
              </div>
            )}
          </div>

          <Form.Group>
            <Form.Label>Select Image</Form.Label>
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Form.Text className="text-muted">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImageModal(false)} disabled={uploading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="info-icon-modal">ℹ️</span> Brand Information
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <div className="brand-info-content">
              <div className="brand-info-section">
                <h6 className="brand-info-label">Brand Name</h6>
                <p className="brand-info-value">{brandInfo?.name || selectedBrand.name}</p>
              </div>

              {brandInfo?.description && (
                <div className="brand-info-section">
                  <h6 className="brand-info-label">Description</h6>
                  <p className="brand-info-value">{brandInfo.description}</p>
                </div>
              )}

              {brandInfo?.contactInfo && (
                <div className="brand-info-section">
                  <h6 className="brand-info-label">Contact Information</h6>
                  <div className="brand-info-value">
                    {typeof brandInfo.contactInfo === 'string' ? (
                      <pre className="brand-info-pre">{brandInfo.contactInfo}</pre>
                    ) : (
                      <div>
                        {brandInfo.contactInfo.email && (
                          <p><strong>Email:</strong> {brandInfo.contactInfo.email}</p>
                        )}
                        {brandInfo.contactInfo.phone && (
                          <p><strong>Phone:</strong> {brandInfo.contactInfo.phone}</p>
                        )}
                        {brandInfo.contactInfo.address && (
                          <p><strong>Address:</strong> {brandInfo.contactInfo.address}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="brand-info-section">
                <h6 className="brand-info-label">Created</h6>
                <p className="brand-info-value">{formatDate(brandInfo?.createdAt || selectedBrand.createdAt)}</p>
              </div>

              {brandInfo?.settings && Object.keys(brandInfo.settings).length > 0 && (
                <div className="brand-info-section">
                  <h6 className="brand-info-label">Settings</h6>
                  <div className="brand-info-value">
                    <pre className="brand-info-pre">
                      {JSON.stringify(brandInfo.settings, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => {
            setShowInfoModal(false);
            navigate(`/brand/${brandId}`);
          }}>
            Edit Brand Info
          </Button>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Sidebar;


