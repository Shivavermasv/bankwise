import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Navbar, Nav } from 'react-bootstrap';
import BankingImage from '../BankingImage/BankingImage';
import AboutUs from '../About/AboutUs';
import TransferMoney from '../TransferMoney/TransferMoney';
import Deposit from '../Deposit/Deposit';
import AccountDetails from '../Account/AccountDetails.js';
import InterestManagement from '../InterrestManagement/InterestManagement';
import TransactionHistory from '../History/TransactionHistory';
import SearchClients from '../Search/SearchClients.js';
import PasswordConfirmationModal from '../PasswordConfirmationModal.js'; // Import the modal component
import './Home.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
    const [activeComponent, setActiveComponent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState(''); // Add state for error message
    const [username, setUsername] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

    useEffect(() => {
        // Fetch username and account number from sessionStorage
        setUsername(sessionStorage.getItem('username') );
        setAccountNumber(sessionStorage.getItem('accountNumber'));
    }, []);

    const handleServiceClick = (component) => {
        setActiveComponent(component);
    };

    const navigate = useNavigate();
    
    const logout = () => {
        navigate('/');
        sessionStorage.clear();
    };

    const handleDeleteAccount = async (password) => {
        const token = sessionStorage.getItem('token');
        try {
            const response = await axios.delete(
                `http://localhost:8091/api/delete`, // API endpoint
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        password: password // Send password as a query parameter
                    }
                }
            );
            if (response && response.status === 200 && response.data !== 'Wrong password') {
                console.log('Account deleted successfully:', response.data);
                sessionStorage.clear();
                navigate('/');
            } else if (response && response.data === 'Wrong password') {
                setErrorMessage('Wrong password'); // Set error message
            }
        } catch (error) {
            console.log(error);
        }
    };

    const deleteAccount = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setErrorMessage(''); // Reset error message when modal closes
    };

    return (
        <div className="home-container">
            <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 custom-navbar">
                <Container>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="mr-auto">
                            <Nav.Link onClick={() => handleServiceClick(navigate('/Home'))}>Home</Nav.Link>
                            <Nav.Link onClick={() => handleServiceClick(<AboutUs />)}>About Us</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                    <div className="navbar-left">
                            <div className="brand-container">
                                <Navbar.Brand href="#" className="brand-logo">Banking System</Navbar.Brand>
                            <div className="subheading">
                                Welcome, {username} | Account Number: {accountNumber}
                            </div>
                        </div>
                    </div>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <div className="navbar-buttons">
                            <Button variant="outline-light" className="mr-2 custom-button" onClick={logout}>Logout</Button>
                            <Button variant="outline-danger" className="custom-button" onClick={deleteAccount}>Delete</Button>
                    </div>
                </Container>
            </Navbar>
            <Container fluid>
                <Row>
                    <Col xs={3} className="service-column">
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<TransferMoney />)}
                        >
                            <h5>Transfer Money</h5>
                            <p>Send money to other clients easily.</p>
                        </div>
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<Deposit />)}
                        >
                            <h5>Deposit</h5>
                            <p>Deposit money into your account.</p>
                        </div>
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<AccountDetails />)}
                        >
                            <h5>Account Details</h5>
                            <p>View and manage your account details.</p>
                        </div>
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<InterestManagement />)}
                        >
                            <h5>Interest Management</h5>
                            <p>Manage your interest rates and types.</p>
                        </div>
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<TransactionHistory />)}
                        >
                            <h5>Transaction History</h5>
                            <p>View your account's transaction history.</p>
                        </div>
                        <div 
                            className="service-slab mt-3" 
                            onClick={() => handleServiceClick(<SearchClients />)}
                        >
                            <h5>Search Clients</h5>
                            <p>Search for other clients by name, phone, or email.</p>
                        </div>
                    </Col>
                    <Col xs={9} className="pane-column">
                        {activeComponent ? (
                            <div className="component-container">
                                <div className="translucent-image">
                                    <BankingImage />
                                </div>
                                {activeComponent}
                            </div>
                        ) : (
                            <BankingImage />
                        )}
                    </Col>
                </Row>
            </Container>

            {/* Password Confirmation Modal */}
            <PasswordConfirmationModal
                show={showModal}
                handleClose={handleCloseModal}
                handleDelete={handleDeleteAccount}
                errorMessage={errorMessage} // Pass the error message as a prop
            />
        </div>
    );
};

export default Home;
