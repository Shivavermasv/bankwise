import React, { useState } from 'react';
import axios from 'axios';
import Lottie from 'react-lottie';
import * as loadingAnimation from '../Loading/Aniki Hamster.json'; // Import the Lottie animation JSON
import './Deposit.css'; // Import custom CSS for styling
import { Button, Form, Alert } from 'react-bootstrap';

const Deposit = () => {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate amount
        if (amount.trim() === '' || Number(amount) <= 0) {
            setError('Amount must be a positive number.');
            return;
        }

        setLoading(true);
        const token = sessionStorage.getItem("token")
        try {
            // Call the API
            const response = await axios.put(
                'http://localhost:8091/api/deposit',
                null,
                { 
                    params: { "amount":amount },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setSuccess(response.data);
        } catch (err) {
            console.log(err)
            setError('An error occurred during the deposit.');
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
            <h2 className="mb-4">Deposit Money</h2>
            {loading ? (
                <div className="d-flex justify-content-center mb-3">
                    <Lottie options={defaultOptions} height={150} width={150} />
                </div>
            ) : (
                <Form onSubmit={handleDeposit} className="border p-4 rounded bg-light">
                    {success && <Alert variant="success">{success}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form.Group controlId="formAmount">
                        <Form.Label>Amount</Form.Label>
                        <Form.Control
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Enter a positive number to deposit.
                        </Form.Text>
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={loading}>
                        Deposit
                    </Button>
                </Form>
            )}
        </div>
    );
};

export default Deposit;
