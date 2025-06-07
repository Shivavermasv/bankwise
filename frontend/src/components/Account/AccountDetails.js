import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Row, Col, Alert, Spinner, Container } from 'react-bootstrap';
import './AccountDetails.css'; // Import the CSS file

const AccountDetails = () => {
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAccountDetails = async () => {
            try {
                const token = sessionStorage.getItem('token'); // Retrieve token from sessionStorage
                console.log(token)
                const response = await axios.get('http://localhost:8091/api/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                console.log(response.data)
                sessionStorage.setItem("accountNumber", response.data.id);
                setAccount(response.data);
                setLoading(false);
            } catch (err) {
                setError('Error fetching account details');
                setLoading(false);
            }
        };

        fetchAccountDetails();
    }, []);

    if (loading) {
        return (
            <Container className="spinner-container">
                <Spinner animation="border" role="status">
                    <span className="sr-only">Loading...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <Container className="container">
            <Row className="justify-content-center">
                <Col md={10} lg={8}> {/* Adjust width as needed */}
                    <Card>
                        <Card.Header as="h5" className="card-header text-center">Account Details</Card.Header>
                        <Card.Body className="card-body">
                            <Row>
                                <Col md={6}>
                                    <Card.Text><strong>Account Holder Name:</strong> {account.accountHolderName}</Card.Text>
                                    <Card.Text><strong>Account ID:</strong> {account.id}</Card.Text>
                                    <Card.Text><strong>Balance:</strong> ₹{account.balance}</Card.Text>
                                </Col>
                                <Col md={6}>
                                    <Card.Text><strong>Interest Rate:</strong> {account.interestType === 1 ? "8% per month" : account.interestType === 2 ? "12% per month" : "12% per 3 months"}</Card.Text>
                                    <Card.Text><strong>Interest Type:</strong> {account.interestType}</Card.Text>
                                    <Card.Text><strong>Account Type:</strong> {account.accountType === 1 ? "Current" : "Saving"}</Card.Text>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AccountDetails;
