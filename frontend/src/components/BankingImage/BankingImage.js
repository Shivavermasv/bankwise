import React from 'react';
import './BankingImage.css';
import bankingImage from './image.jpg'; // Update the path if necessary

const BankingImage = () => {
    return (
        <div className="banking-image">
            <img src={bankingImage} alt="Banking System" />
        </div>
    );
};

export default BankingImage;
