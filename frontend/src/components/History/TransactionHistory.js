import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Spinner, Alert } from 'react-bootstrap';
import './TransactionHistory.css'; // Import custom CSS for styling

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTransactions = async () => {
            const token = sessionStorage.getItem('token');
            console.log(token);
            try {
                const response = await axios.get(
                    'http://localhost:8091/api/transactions',
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setTransactions(response.data);
                setLoading(false);
            } catch (err) {
                console.log(err);
                setError('Error fetching transaction history');
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);


    return (
        <div className="container mt-5">
            <h2 className="mb-4">Transaction History</h2>
            {loading ? (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : (
                <div className="row">
                    {transactions.map((transaction) => (
                        <div key={transaction.id} className="col-md-4 mb-4">
                            <Card className="transaction-card">
                                <Card.Body>
                                    <Card.Title>{transaction.transactionType === 'credit' ? 'Credit' : 'Debit'}</Card.Title>
                                    <Card.Subtitle className="mb-2 text-muted">
                                        {transaction.transactionDate}
                                    </Card.Subtitle>
                                    <Card.Text>
                                        Amount: {transaction.amount} <br />
                                        Description: {transaction.description || 'N/A'}
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
