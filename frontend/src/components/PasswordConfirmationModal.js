import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const PasswordConfirmationModal = ({ show, handleClose, handleDelete, errorMessage }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = () => {
        if (password) {
            handleDelete(password);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Confirm Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {errorMessage && <Alert variant="danger">{errorMessage}</Alert>} {/* Show alert if error message exists */}
                <Form.Group controlId="formPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                        type="password" 
                        placeholder="Enter your password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        isInvalid={!!errorMessage} // Make the field red if there's an error
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="danger" onClick={handleSubmit}>
                    Delete Account
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PasswordConfirmationModal;
