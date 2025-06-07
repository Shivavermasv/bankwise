import React from 'react';
import './ServiceSlab.css';

const ServiceSlab = ({ title, description, onClick }) => {
    return (
        <div className="service-slab" onClick={onClick}>
            <h3>{title}</h3>
            <p className="service-description">{description}</p>
        </div>
    );
};

export default ServiceSlab;

