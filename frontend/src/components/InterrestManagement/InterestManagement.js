import React, { useState } from 'react';
import axios from 'axios';
import Lottie from 'react-lottie';
import * as loadingAnimation from '../Loading/Aniki Hamster.json'; // Import the Lottie animation JSON
import './InterestManagement.css'; // Import custom CSS for styling
import { Button, Form, Alert } from 'react-bootstrap';

const InterestManagementComponent = () => {
    const [interestType, setInterestType] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdateInterestType = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate interest type
        if (!interestType || interestType < 1 || interestType > 3) {
            setError('Please select a valid interest type (1, 2, or 3).');
            return;
        }

        setLoading(true);


        try {
            // Call the API
            const response = await axios.put(
                'http://localhost:8091/api/updateIT',
                null,
                { 
                    params: { type: interestType },
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                 }
            );
            setSuccess(response.data);
        } catch (err) {
            setError('An error occurred while updating the interest type.');
        } finally {
            // Simulate loading time
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        }
    };

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: loadingAnimation.default,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    return (
        <div className="container mt-5">
            <h2 className="mb-4">Manage Interest Type</h2>
            {loading ? (
                <div className="d-flex justify-content-center mb-3">
                    <Lottie options={defaultOptions} height={150} width={150} />
                </div>
            ) : (
                <Form onSubmit={handleUpdateInterestType} className="border p-4 rounded bg-light">
                    {success && <Alert variant="success">{success}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form.Group controlId="formInterestType">
                        <Form.Label>Interest Type</Form.Label>
                        <Form.Control
                            as="select"
                            value={interestType}
                            onChange={(e) => setInterestType(e.target.value)}
                        >
                            <option value="">Select an interest type</option>
                            <option value="1">8% per month (amount > 5,000)</option>
                            <option value="2">12% per month (amount > 30k)</option>
                            <option value="3">12% per 3 months (amount > 20,000)</option>
                        </Form.Control>
                        <Form.Text className="text-muted">
                            Choose the appropriate interest type for your account.
                        </Form.Text>
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={loading}>
                        Update Interest Type
                    </Button>
                </Form>
            )}
        </div>
    );
};

export default InterestManagementComponent;
