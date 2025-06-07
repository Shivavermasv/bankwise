import React, { useState } from 'react';
import axios from 'axios';
import Lottie from 'react-lottie';
import * as loadingAnimation from '../Loading/Aniki Hamster.json'; // Import the Lottie animation JSON
import './TransferMoney.css'; // Import custom CSS for styling

const TransferMoney = () => {
    const [transferData, setTransferData] = useState({ toAccount: '', amount: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setTransferData({ ...transferData, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { toAccount, amount } = transferData;
        const token = sessionStorage.getItem('token');
        console.log(token)

        try {
            const response = await axios.post(
                `http://localhost:8091/api/transfer`,
                null,
                {
                    params: {
                        "toAccountNumber" : toAccount,
                        amount
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Simulate a delay to ensure the loading animation plays for at least 1 second
            setTimeout(() => {
                setSuccess(response.data);
                setError('');
                setLoading(false);
            }, 1000);
        } catch (error) {
            setTimeout(() => {
                setError('There was an error transferring money!');
                setSuccess('');
                setLoading(false);
            }, 1000);
            console.error('Error:', error.response ? error.response.data : error.message);
        }
    }

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: loadingAnimation.default,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };

    return (
        <div className="transfer-money-container">
            <h2>Transfer Money</h2>
            {loading ? (
                <div className="loading-animation">
                    <Lottie options={defaultOptions} height={150} width={150} />
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="transfer-form">
                    {success && <div className="alert alert-success">{success}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}
                    <div className="form-group">
                        <label>To Account ID</label>
                        <input
                            type="text"
                            className="form-control"
                            name="toAccount"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Amount</label>
                        <input
                            type="number"
                            className="form-control"
                            name="amount"
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">Transfer</button>
                </form>
            )}
        </div>
    );
}

export default TransferMoney;
