import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import axios from 'axios';
import './Login.css'; // Import custom CSS
import { useNavigate } from 'react-router-dom';

const Login = ({ onHide }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    // Load username and password from local storage when the component mounts
    useEffect(() => {
        const storedUsername = sessionStorage.getItem('username');
        const storedPassword = sessionStorage.getItem('password');
        if (storedUsername) setUsername(storedUsername);
        if (storedPassword) setPassword(storedPassword);
    }, []);
    

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://localhost:8091/login', {
                username,
                password,
            });
            sessionStorage.setItem("username", username);
            sessionStorage.setItem("password", password);
            sessionStorage.setItem('token', response.headers.authorization); 
            sessionStorage.setItem('accountNumber', response.headers.account);
            console.log('Navigating to /Home');
            navigate('/Home');

        } catch (error) {
            console.log(error)
            alert('Login failed!');
        }
    };

    return (
        <Modal show onHide={onHide} className="login-modal">
            <Modal.Header closeButton>
                <Modal.Title>Login</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form className="login-form">
                    <Form.Group>
                        <Form.Label>Username</Form.Label>
                        <Form.Control 
                            type="text" 
                            value={username} // Pre-fill the username field
                            placeholder="Enter username" 
                            onChange={(e) => setUsername(e.target.value)} 
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Password</Form.Label>
                        <Form.Control 
                            type="password" 
                            value={password} // Pre-fill the password field
                            placeholder="Enter password" 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </Form.Group>
                    <Button 
                        variant="primary" 
                        onClick={handleLogin}
                        className="login-btn"
                    >
                        Submit
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default Login;
