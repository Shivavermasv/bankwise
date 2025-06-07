import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import './Signup.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const Signup = ({ onHide }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dateOfBirth, setDob] = useState(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [accountType, setAccountType] = useState('');
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validateFields = () => {
        const errors = {};

        if (!firstName) {
            errors.firstName = "First name is required";
        }

        if (!lastName) {
            errors.lastName = "Last name is required";
        }

        if (!dateOfBirth) {
            errors.dateOfBirth = "Date of birth is required";
        }

        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            errors.email = "Valid email is required";
        }

        if (!phone || phone.length < 12) {  // Adjust validation for international phone numbers
            errors.phone = "Valid phone number is required";
        }

        if (!password || password.length < 4) {
            errors.password = "Password must be at least 4 characters long";
        }

        if (!accountType) {
            errors.accountType = "Account type is required";
        }

        return errors;
    };

    const handleSignup = async () => {
        const validationErrors = validateFields();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            // Concatenate first name and last name
            const fullName = `${firstName} ${lastName}`;

            const response = await axios.post('http://localhost:8091/api/create', {
                "name": fullName,  // Send concatenated name
                "dateOfBirth": dateOfBirth,
                "email": email,
                "phone": phone,
                "password": password,
                "accountType": accountType === "Current" ? 1 : 2, // Send accountType as 1 or 2
            });

            if (response.status === 200) {
                sessionStorage.setItem("username", fullName);  // Store full name in session
                sessionStorage.setItem("password", password);
                onHide();
                navigate('/Login');
            }
        } catch (error) {
            alert('Signup failed!');
            console.log(error);
        }
    };

    // Reset errors when input changes
    const handleInputChange = (setter, fieldName) => (e) => {
        setter(e.target.value);
        setErrors((prevErrors) => ({ ...prevErrors, [fieldName]: undefined }));
    };

    return (
        <Modal show onHide={onHide} className="signup-modal">
            <Modal.Header closeButton>
                <Modal.Title>Sign Up</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form className="signup-form">
                    <Row>
                        <Col>
                            <Form.Group controlId="formFirstName">
                                <Form.Label>First Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter first name"
                                    value={firstName}
                                    onChange={handleInputChange(setFirstName, 'firstName')}
                                    isInvalid={!!errors.firstName}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.firstName}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group controlId="formLastName">
                                <Form.Label>Last Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter last name"
                                    value={lastName}
                                    onChange={handleInputChange(setLastName, 'lastName')}
                                    isInvalid={!!errors.lastName}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.lastName}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group controlId="formDateOfBirth">
                        <Form.Label>Date of Birth</Form.Label>
                        <DatePicker
                            selected={dateOfBirth}
                            onChange={(date) => setDob(date)}
                            dateFormat="yyyy/MM/dd"
                            className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                            placeholderText="Select date"
                            showYearDropdown
                            showMonthDropdown
                            dropdownMode="select"
                        />
                        {errors.dateOfBirth && (
                            <div className="invalid-feedback d-block">
                                {errors.dateOfBirth}
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group controlId="formEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="Enter email"
                            value={email}
                            onChange={handleInputChange(setEmail, 'email')}
                            isInvalid={!!errors.email}
                            onBlur={() => {
                                if (!email.includes('@')) {
                                    setEmail(email + '@gmail.com');  // Auto-suggest @gmail.com if @ is missing
                                }
                            }}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.email}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group controlId="formPhone">
                        <Form.Label>Phone</Form.Label>
                        <PhoneInput
                            country={'in'}  // Default country code
                            value={phone}   // Bind phone state
                            onChange={setPhone} // Update phone state on change
                            inputClass={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                            placeholder="Enter phone number"
                        />
                        {errors.phone && (
                            <div className="invalid-feedback d-block">
                                {errors.phone}
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group controlId="formPassword">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={handleInputChange(setPassword, 'password')}
                            isInvalid={!!errors.password}
                            minLength={4}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.password}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group controlId="formAccountType">
                        <Form.Label>Account Type</Form.Label>
                        <Form.Control
                            as="select"
                            value={accountType}
                            onChange={handleInputChange(setAccountType, 'accountType')}
                            isInvalid={!!errors.accountType}
                        >
                            <option value="">Select account type</option>
                            <option value="Current">Current</option>
                            <option value="Savings">Savings</option>
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">
                            {errors.accountType}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Button
                        variant="success"
                        onClick={handleSignup}
                        className="signup-btn"
                        block
                    >
                        Submit
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default Signup;
