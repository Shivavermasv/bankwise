import React, { useState } from 'react';
import axios from 'axios';
import Lottie from 'react-lottie';
import * as loadingAnimation from '../Loading/Aniki Hamster.json'; // Import the Lottie animation JSON
import './SearchClients.css'; // Import custom CSS for styling
import { FaClipboard } from 'react-icons/fa'; // Import copy icon from react-icons

const SearchClients = () => {
    const [searchParams, setSearchParams] = useState({ name: '', phone: '', email: '' });
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchClients = async () => {
        setLoading(true);
        const { name, phone, email } = searchParams;
        const token = sessionStorage.getItem('token');
        try {
            const response = await axios.get('http://localhost:8091/api/search', {
                params: { name, phone, email },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.data === 'NO USER FOUND !!') {
                setResults([]);
                setError('No user found');
            } else {
                setResults(response.data);
                setError('');
            }
        } catch (err) {
            console.error('Error searching clients:', err);
            setError('Error fetching clients');
        }
        setLoading(false);
    };

    const handleRefresh = () => {
        fetchClients(); // Refresh the list by fetching data again
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
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
        <div className="container">
            <h2>Search Clients</h2>
            <form>
                <div className="row">
                    <div className="form-group col-md-4">
                        <label>Name</label>
                        <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={searchParams.name}
                            onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group col-md-4">
                        <label>Phone</label>
                        <input
                            type="text"
                            className="form-control"
                            name="phone"
                            value={searchParams.phone}
                            onChange={(e) => setSearchParams({ ...searchParams, phone: e.target.value })}
                        />
                    </div>
                    <div className="form-group col-md-4">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={searchParams.email}
                            onChange={(e) => setSearchParams({ ...searchParams, email: e.target.value })}
                        />
                    </div>
                </div>
                <button type="button" className="btn btn-refresh" onClick={handleRefresh}>
                    Refresh
                </button>
            </form>
            {loading ? (
                <div className="loading-animation">
                    <Lottie options={defaultOptions} height={150} width={150} />
                </div>
            ) : (
                <div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <h3>Results</h3>
                    <div className="card-container">
                        {results.map(client => (
                            <div key={client.accountNumber} className="card">
                                <p><strong>Name:</strong> {client.clientName}</p>
                                <p><strong>Phone:</strong> {client.clientPhone}</p>
                                <p>
                                    <strong>Account Number:</strong>
                                    {client.accountNumber}
                                    <FaClipboard 
                                        className="copy-icon" 
                                        onClick={() => copyToClipboard(client.accountNumber)} 
                                    />
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchClients;
